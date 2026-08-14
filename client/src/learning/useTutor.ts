import { Dispatch, SetStateAction, useCallback, useRef, useState } from "react";

import { PgExplorer, PgTutorial } from "../utils";
import { streamTutor } from "./api";
import { LEARNING_EXAMPLES } from "./examples";
import { createTutorialTeaching } from "./tutorial-teaching";
import { getTutorialWorkspaceContent } from "./tutorial-workspace";
import { validateWorkspacePatch } from "./workspace-patch";
import {
  createLearningId,
  createWorkspaceLearningState,
} from "./workspace-state";
import type { TutorMessage, TutorToolCall } from "./types";
import type { useLearningWorkspace } from "./useLearningWorkspace";
import type { useProgramActions } from "./useProgramActions";

type LearningWorkspace = ReturnType<typeof useLearningWorkspace>;
type ProgramActions = ReturnType<typeof useProgramActions>;

type UseTutorOptions = {
  activeWorkspaceNameRef: LearningWorkspace["activeWorkspaceNameRef"];
  addEvent: LearningWorkspace["addEvent"];
  patch: LearningWorkspace["patch"];
  runBuild: ProgramActions["runBuild"];
  runDeploy: ProgramActions["runDeploy"];
  runInteraction: ProgramActions["runInteraction"];
  setMessages: LearningWorkspace["setMessages"];
  setMobilePanel: Dispatch<SetStateAction<"learn" | "code" | "tutor">>;
  setPatch: LearningWorkspace["setPatch"];
  setProgramStage: LearningWorkspace["setProgramStage"];
  setUndoFiles: LearningWorkspace["setUndoFiles"];
  setWorkspaceField: LearningWorkspace["setWorkspaceField"];
  undoFiles: LearningWorkspace["undoFiles"];
  workspaceStatesRef: LearningWorkspace["workspaceStatesRef"];
};

export const useTutor = ({
  activeWorkspaceNameRef,
  addEvent,
  patch,
  runBuild,
  runDeploy,
  runInteraction,
  setMessages,
  setMobilePanel,
  setPatch,
  setProgramStage,
  setUndoFiles,
  setWorkspaceField,
  undoFiles,
  workspaceStatesRef,
}: UseTutorOptions) => {
  const [chatInput, setChatInput] = useState("");
  const [chatting, setChatting] = useState(false);
  const [patchApplying, setPatchApplying] = useState(false);
  const patchApplyingRef = useRef(false);

  const executeTool = useCallback(
    async (tool: TutorToolCall, workspaceName: string) => {
      switch (tool.name) {
        case "propose_workspace_patch": {
          const proposedPatch = validateWorkspacePatch(tool.arguments);
          setWorkspaceField(workspaceName, "patch", proposedPatch);
          addEvent(
            "idea",
            proposedPatch.title,
            "Review the files and explanation before applying it.",
            "idle",
            undefined,
            undefined,
            workspaceName
          );
          return "The proposed workspace patch is visible for learner review. It has not been applied.";
        }
        case "build_program": {
          if (activeWorkspaceNameRef.current !== workspaceName) {
            throw new Error(
              "The learner switched workspaces. Ask them to return before starting this build."
            );
          }
          return await runBuild();
        }
        case "deploy_program": {
          if (activeWorkspaceNameRef.current !== workspaceName) {
            throw new Error(
              "The learner switched workspaces. Ask them to return before deploying this program."
            );
          }
          return await runDeploy();
        }
        case "run_instruction": {
          if (activeWorkspaceNameRef.current !== workspaceName) {
            throw new Error(
              "The learner switched workspaces. Ask them to return before running this instruction."
            );
          }
          return await runInteraction(tool.arguments.instruction);
        }
      }
    },
    [
      activeWorkspaceNameRef,
      addEvent,
      runBuild,
      runDeploy,
      runInteraction,
      setWorkspaceField,
    ]
  );

  const askTutor = useCallback(
    async (message: string) => {
      const clean = message.trim();
      if (!clean || chatting) return;
      const workspaceName = activeWorkspaceNameRef.current;
      const workspaceState =
        workspaceStatesRef.current[workspaceName] ??
        createWorkspaceLearningState(workspaceName);
      const workspaceLesson = LEARNING_EXAMPLES.find(
        (example) => example.workspaceName === workspaceName
      );
      const updateMessages = (value: SetStateAction<TutorMessage[]>) =>
        setWorkspaceField(workspaceName, "messages", value);
      const learnerMessage: TutorMessage = {
        id: createLearningId(),
        role: "learner",
        text: clean,
      };
      const tutorId = createLearningId();
      updateMessages((current) => [
        ...current,
        learnerMessage,
        { id: tutorId, role: "tutor", text: "", streaming: true },
      ]);
      setChatInput("");
      setChatting(true);
      setMobilePanel("tutor");
      try {
        let responseId = workspaceState.previousResponseId;
        const workspaceTutorial = PgTutorial.all.find(
          (tutorial) => tutorial.name === workspaceName
        );
        let nextMessage = clean;
        if (workspaceTutorial) {
          const tutorialContent = await getTutorialWorkspaceContent(
            workspaceTutorial
          );
          const teaching = createTutorialTeaching(
            workspaceTutorial,
            tutorialContent
          );
          const currentTeaching =
            workspaceState.programStage === "deployed"
              ? teaching.deployed
              : workspaceState.programStage === "built"
              ? teaching.built
              : teaching.source;
          nextMessage = [
            `You are teaching the imported tutorial “${workspaceTutorial.name}”.`,
            `The learner is at the ${workspaceState.programStage} stage.`,
            "Use this authored tutorial context when answering, but do not repeat it unless it helps:",
            currentTeaching.slice(0, 16000),
            "Learner question:",
            clean,
          ].join("\n\n");
        }
        let toolOutputs: Array<{ callId: string; output: unknown }> | undefined;

        for (let turn = 0; turn < 4; turn += 1) {
          const toolCalls: TutorToolCall[] = [];
          const createdResponseId = await streamTutor({
            message: nextMessage,
            lessonId: workspaceLesson?.id ?? "custom-program",
            previousResponseId: responseId,
            toolOutputs,
            onResponseId: (id) =>
              setWorkspaceField(workspaceName, "previousResponseId", id),
            onText: (delta) =>
              updateMessages((current) =>
                current.map((item) =>
                  item.id === tutorId
                    ? { ...item, text: item.text + delta }
                    : item
                )
              ),
            onToolCall: (tool) => toolCalls.push(tool),
          });
          responseId = createdResponseId ?? responseId;
          if (!toolCalls.length) break;

          toolOutputs = [];
          for (const tool of toolCalls) {
            try {
              toolOutputs.push({
                callId: tool.callId,
                output: await executeTool(tool, workspaceName),
              });
            } catch (error: any) {
              const message = error.message ?? "The action failed.";
              addEvent(
                "idea",
                "Action failed",
                message,
                "error",
                undefined,
                undefined,
                workspaceName
              );
              toolOutputs.push({
                callId: tool.callId,
                output: { error: message },
              });
            }
          }
          nextMessage = "";
        }
      } catch (error: any) {
        updateMessages((current) =>
          current.map((item) =>
            item.id === tutorId
              ? {
                  ...item,
                  text:
                    error.message ||
                    "The tutor could not respond. Your code and Surfpool are still safe.",
                }
              : item
          )
        );
      } finally {
        updateMessages((current) =>
          current.map((item) =>
            item.id === tutorId ? { ...item, streaming: false } : item
          )
        );
        setChatting(false);
      }
    },
    [
      activeWorkspaceNameRef,
      addEvent,
      chatting,
      executeTool,
      setMobilePanel,
      setWorkspaceField,
      workspaceStatesRef,
    ]
  );

  const applyPatch = async () => {
    if (!patch || patchApplyingRef.current) return;
    patchApplyingRef.current = true;
    setPatchApplying(true);
    const pendingPatch = patch;
    const undoMessageId = createLearningId();
    const previous = pendingPatch.files.map(({ path }) => ({
      path,
      content: PgExplorer.getFileContent(path),
    }));
    try {
      for (const file of pendingPatch.files) {
        await PgExplorer.createItem(file.path, file.content, {
          override: true,
        });
        const savedContent = PgExplorer.getFileContent(file.path);
        const persistedContent = PgExplorer.isTemporary
          ? savedContent
          : await PgExplorer.fs.readToString(file.path);
        if (
          savedContent !== file.content ||
          persistedContent !== file.content
        ) {
          throw new Error(`${file.path} did not save correctly.`);
        }
      }
      setUndoFiles(previous);
      setPatch(null);
      setProgramStage("source");
      setMessages((current) => [
        ...current.map((message) =>
          message.action === "undo-workspace-change"
            ? { ...message, actionAvailable: false }
            : message
        ),
        {
          id: undoMessageId,
          role: "system",
          text: "Change applied to your workspace.",
          action: "undo-workspace-change",
          actionAvailable: true,
        },
      ]);
      addEvent(
        "idea",
        "Tutor change applied",
        "The saved files and open editor were updated. The Undo action stays beside the change in your conversation.",
        "success"
      );
    } catch (error: any) {
      for (const file of [...previous].reverse()) {
        try {
          if (file.content === undefined) {
            if (PgExplorer.getFile(file.path)) {
              await PgExplorer.deleteItem(file.path);
            }
          } else {
            await PgExplorer.createItem(file.path, file.content, {
              override: true,
            });
          }
        } catch {
          // Keep the original save error as the actionable failure.
        }
      }
      addEvent(
        "idea",
        "Tutor change could not be applied",
        error?.message ?? "The workspace files could not be updated.",
        "error"
      );
    } finally {
      patchApplyingRef.current = false;
      setPatchApplying(false);
    }
  };

  const undoPatch = async (messageId: string) => {
    if (!undoFiles) return;
    for (const file of undoFiles) {
      if (file.content === undefined) {
        await PgExplorer.deleteItem(file.path);
      } else {
        await PgExplorer.createItem(file.path, file.content, {
          override: true,
        });
      }
    }
    setUndoFiles(null);
    setProgramStage("source");
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              text: "Change undone.",
              actionAvailable: false,
            }
          : message
      )
    );
    addEvent(
      "idea",
      "Tutor change undone",
      "Your previous workspace files are restored.",
      "success"
    );
  };

  return {
    applyPatch,
    askTutor,
    chatInput,
    chatting,
    patchApplying,
    setChatInput,
    undoPatch,
  };
};
