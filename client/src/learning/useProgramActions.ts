import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useRef,
  useState,
} from "react";

import { buildCurrentProgram } from "../commands/build/build";
import { PgCommand, PgConnection, PgExplorer, PgProgramInfo } from "../utils";
import { LEARNING_EXAMPLES, type LearningExample } from "./examples";
import {
  getExplorerAddressUrl,
  getExplorerTransactionUrl,
} from "./explorer-links";
import { humanizeInstructionName } from "./format";
import { markLessonProgress } from "./lesson-progress";
import { shortAddress } from "./useLearningNetwork";
import type { useLearningWorkspace } from "./useLearningWorkspace";
import type { ChainAction } from "./workspace-state";
import type { TimelineView } from "./ActivityTimeline";

type LearningWorkspace = ReturnType<typeof useLearningWorkspace>;

type UseProgramActionsOptions = {
  activeBuildLogRef: MutableRefObject<{
    workspaceName: string;
    lines: string[];
  } | null>;
  activeWorkspaceNameRef: LearningWorkspace["activeWorkspaceNameRef"];
  addEvent: LearningWorkspace["addEvent"];
  customProgram: string | null;
  ensureSurfpool: () => Promise<void> | void;
  lessonId: LearningExample["id"];
  setProgramStage: LearningWorkspace["setProgramStage"];
  setTimelineView: Dispatch<SetStateAction<TimelineView>>;
  setWorkspaceField: LearningWorkspace["setWorkspaceField"];
  surfpoolConnected: boolean;
  terminalOwnerRef: MutableRefObject<string | null>;
  workspaceStatesRef: LearningWorkspace["workspaceStatesRef"];
};

export const useProgramActions = ({
  activeBuildLogRef,
  activeWorkspaceNameRef,
  addEvent,
  customProgram,
  ensureSurfpool,
  lessonId,
  setProgramStage,
  setTimelineView,
  setWorkspaceField,
  surfpoolConnected,
  terminalOwnerRef,
  workspaceStatesRef,
}: UseProgramActionsOptions) => {
  const [backgroundAction, setBackgroundAction] = useState<{
    action: ChainAction;
    workspaceName: string;
  } | null>(null);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [interactionIdl, setInteractionIdl] =
    useState<typeof PgProgramInfo.idl>(null);
  const [interactionReceipt, setInteractionReceipt] = useState<{
    signature: string;
    instructionName: string;
  } | null>(null);
  const chainActionRef = useRef<{
    action: ChainAction;
    workspaceName: string;
  } | null>(null);

  const buildProgram = useCallback(
    async (workspaceName: string) => {
      if (PgExplorer.currentWorkspaceName !== workspaceName) {
        throw new Error("Open this workspace before starting its build.");
      }
      activeBuildLogRef.current = { workspaceName, lines: [] };
      setWorkspaceField(workspaceName, "programStage", "source");
      addEvent(
        "build",
        "Building the program",
        "Rust is compiling to Solana bytecode and Anchor is generating an IDL.",
        "working",
        undefined,
        undefined,
        workspaceName
      );
      try {
        // Call the build handler directly so it snapshots this workspace before
        // navigation can switch PgExplorer to another lesson.
        const result = await buildCurrentProgram();
        if (result.failed) {
          throw new Error(
            "The compiler found an issue. Ask the tutor to explain the highlighted error."
          );
        }
        if (result.idl) {
          const idlJson = JSON.stringify(result.idl, null, 2);
          if (PgExplorer.currentWorkspaceName === workspaceName) {
            await PgExplorer.createItem("idl.json", idlJson, {
              override: true,
            });
          } else {
            await PgExplorer.fs.writeFile(
              `/${workspaceName}/idl.json`,
              idlJson,
              { createParents: true }
            );
          }
        }
        setWorkspaceField(workspaceName, "programStage", "built");
        const builtLesson = LEARNING_EXAMPLES.find(
          (example) => example.workspaceName === workspaceName
        );
        if (builtLesson) markLessonProgress(builtLesson.id, "built");
        addEvent(
          "build",
          "Build complete",
          PgExplorer.currentWorkspaceName === workspaceName
            ? "The program binary is ready, and its generated IDL is open in a new tab."
            : "The program binary and generated IDL are ready. Open this workspace to inspect them.",
          "success",
          undefined,
          undefined,
          workspaceName
        );
        activeBuildLogRef.current = null;
        return "Build completed and an IDL was generated.";
      } catch (error: any) {
        setWorkspaceField(workspaceName, "programStage", "source");
        const buildOutput =
          activeBuildLogRef.current?.workspaceName === workspaceName
            ? activeBuildLogRef.current.lines.join("\n").trim()
            : "";
        const errorMessage = error?.message || "Build failed.";
        const diagnostic =
          buildOutput && !buildOutput.includes(errorMessage)
            ? `${buildOutput}\n\n${errorMessage}`
            : buildOutput || errorMessage;
        activeBuildLogRef.current = null;
        addEvent(
          "build",
          "Build failed",
          "The compiler found an issue. Copy the error or ask Program Pal to walk through it.",
          "error",
          diagnostic,
          undefined,
          workspaceName
        );
        throw error;
      }
    },
    [activeBuildLogRef, addEvent, setWorkspaceField]
  );

  const deployProgram = useCallback(async () => {
    if (!surfpoolConnected) await ensureSurfpool();
    if (!PgProgramInfo.uuid || PgProgramInfo.lastBuildFailed) {
      await buildProgram(activeWorkspaceNameRef.current);
    }
    addEvent(
      "deploy",
      "Deploying to Surfpool",
      "The browser is writing the program binary into an executable account.",
      "working"
    );
    try {
      await PgCommand.deploy.execute();
      setProgramStage("deployed");
      if (!customProgram) markLessonProgress(lessonId, "deployed");
      addEvent(
        "deploy",
        "Program is onchain",
        `Program ${shortAddress(
          PgProgramInfo.pk?.toBase58() ?? ""
        )} is executable on the configured Surfpool.`,
        "success",
        undefined,
        PgProgramInfo.pk
          ? getExplorerAddressUrl(PgProgramInfo.pk.toBase58())
          : undefined
      );
      return "Program deployed successfully to the configured Surfpool.";
    } catch (error: any) {
      addEvent("deploy", "Deployment failed", error.message, "error");
      throw error;
    }
  }, [
    addEvent,
    activeWorkspaceNameRef,
    buildProgram,
    customProgram,
    ensureSurfpool,
    lessonId,
    setProgramStage,
    surfpoolConnected,
  ]);

  const openInteraction = useCallback(
    (instruction?: string) => {
      const idl = PgProgramInfo.idl;
      if (!idl) {
        addEvent(
          "instruction",
          "Build first",
          "The interaction panel is generated from the IDL created during a successful build.",
          "error"
        );
        return "The program needs a successful build before its instructions can be opened.";
      }
      setInteractionIdl(idl);
      setInteractionOpen(true);
      setInteractionReceipt(null);
      return instruction
        ? `Opened the ${instruction} controls in this page.`
        : `Opened ${idl.instructions.length} callable instruction${
            idl.instructions.length === 1 ? "" : "s"
          } in this page.`;
    },
    [addEvent]
  );

  const recordInstructionSuccess = useCallback(
    (signature: string, instructionName: string) => {
      setInteractionReceipt({ signature, instructionName });
      addEvent(
        "instruction",
        `${humanizeInstructionName(instructionName)} confirmed`,
        "Surfpool accepted the transaction. Open it in Explorer to inspect the instruction and logs.",
        "success",
        undefined,
        getExplorerTransactionUrl(signature)
      );
      setTimelineView("notes");
    },
    [addEvent, setTimelineView]
  );

  const setInlineInteractionRunning = useCallback(
    (workspaceName: string, running: boolean) => {
      if (running) {
        const activeAction = {
          action: "interact" as const,
          workspaceName,
        };
        chainActionRef.current = activeAction;
        terminalOwnerRef.current = workspaceName;
        setBackgroundAction(activeAction);
        setWorkspaceField(workspaceName, "chainAction", "interact");
        return;
      }

      if (
        chainActionRef.current?.action === "interact" &&
        chainActionRef.current.workspaceName === workspaceName
      ) {
        chainActionRef.current = null;
        terminalOwnerRef.current = null;
        setBackgroundAction(null);
        setWorkspaceField(workspaceName, "chainAction", null);
      }
    },
    [setWorkspaceField, terminalOwnerRef]
  );

  const runLessonInteraction = useCallback(
    async (instruction?: string) => {
      const workspaceName = activeWorkspaceNameRef.current;
      if (
        workspaceStatesRef.current[workspaceName]?.programStage !== "deployed"
      ) {
        await deployProgram();
      }
      addEvent(
        "instruction",
        `Running ${instruction ?? "the lesson interaction"}`,
        "The browser test is submitting a real transaction to the configured Surfpool.",
        "working"
      );
      const connection = PgConnection.current;
      const signatures: string[] = [];
      const originalSendRawTransaction = connection.sendRawTransaction;
      const sendRawTransaction = originalSendRawTransaction.bind(connection);
      connection.sendRawTransaction = async (...args) => {
        const signature = await sendRawTransaction(...args);
        signatures.push(signature);
        return signature;
      };
      try {
        await PgCommand.test.execute();
        const signature = signatures.at(-1);
        if (signature) {
          setInteractionReceipt({
            signature,
            instructionName: instruction ?? "tutorial test",
          });
        }
        addEvent(
          "instruction",
          "Interaction confirmed",
          "The lesson test sent its transaction and checked the resulting onchain state.",
          "success",
          undefined,
          signature ? getExplorerTransactionUrl(signature) : undefined
        );
        return "The lesson interaction ran successfully on the configured Surfpool.";
      } catch (error: any) {
        addEvent("instruction", "Interaction failed", error.message, "error");
        throw error;
      } finally {
        connection.sendRawTransaction = originalSendRawTransaction;
      }
    },
    [activeWorkspaceNameRef, addEvent, deployProgram, workspaceStatesRef]
  );

  const runChainAction = useCallback(
    async (action: ChainAction, operation: () => Promise<string> | string) => {
      if (chainActionRef.current) {
        return `${
          chainActionRef.current.action[0].toUpperCase() +
          chainActionRef.current.action.slice(1)
        } is already in progress for another workspace.`;
      }

      const workspaceName = activeWorkspaceNameRef.current;
      const activeAction = { action, workspaceName };
      chainActionRef.current = activeAction;
      terminalOwnerRef.current = workspaceName;
      setBackgroundAction(activeAction);
      setWorkspaceField(workspaceName, "chainAction", action);
      const startedAt = Date.now();

      try {
        return await operation();
      } finally {
        const remainingClickGuard = Math.max(0, 350 - (Date.now() - startedAt));
        if (remainingClickGuard) {
          await new Promise((resolve) =>
            window.setTimeout(resolve, remainingClickGuard)
          );
        }
        if (chainActionRef.current === activeAction) {
          chainActionRef.current = null;
          terminalOwnerRef.current = null;
          setBackgroundAction(null);
          setWorkspaceField(workspaceName, "chainAction", null);
        }
      }
    },
    [activeWorkspaceNameRef, setWorkspaceField, terminalOwnerRef]
  );

  const runBuild = useCallback(() => {
    const workspaceName = activeWorkspaceNameRef.current;
    return runChainAction("build", () => buildProgram(workspaceName));
  }, [activeWorkspaceNameRef, buildProgram, runChainAction]);

  const runDeploy = useCallback(
    () => runChainAction("deploy", deployProgram),
    [deployProgram, runChainAction]
  );

  const runOpenInteraction = useCallback(
    () => runChainAction("interact", openInteraction),
    [openInteraction, runChainAction]
  );

  const runInteraction = useCallback(
    (instruction?: string) =>
      runChainAction("interact", () => runLessonInteraction(instruction)),
    [runChainAction, runLessonInteraction]
  );

  return {
    backgroundAction,
    chainActionRef,
    interactionIdl,
    interactionOpen,
    interactionReceipt,
    recordInstructionSuccess,
    runBuild,
    runDeploy,
    runInteraction,
    runOpenInteraction,
    setInlineInteractionRunning,
    setInteractionOpen,
  };
};
