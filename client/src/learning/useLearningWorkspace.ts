import { SetStateAction, useCallback, useRef, useState } from "react";

import { PgTutorial } from "../utils";
import { getTutorialWorkspaceContent } from "./tutorial-workspace";
import {
  createTutorialTeaching,
  TutorialTeachingStage,
} from "./tutorial-teaching";
import {
  createLearningEvent,
  createLearningId,
  createWorkspaceLearningState,
  ProgramStage,
  readWorkspaceLearningStates,
  WorkspaceLearningState,
  WorkspaceLearningStates,
  writeWorkspaceLearningStates,
} from "./workspace-state";
import type { LearningEvent, TutorMessage, WorkspacePatch } from "./types";

export const useLearningWorkspace = (initialWorkspaceName: string) => {
  const [activeWorkspaceName, setActiveWorkspaceName] =
    useState(initialWorkspaceName);
  const activeWorkspaceNameRef = useRef(initialWorkspaceName);
  const [workspaceStates, setWorkspaceStates] =
    useState<WorkspaceLearningStates>(() => {
      const saved = readWorkspaceLearningStates();
      if (!saved[initialWorkspaceName]) {
        saved[initialWorkspaceName] =
          createWorkspaceLearningState(initialWorkspaceName);
      }
      return saved;
    });
  const workspaceStatesRef = useRef(workspaceStates);
  const tutorialTeachingPromisesRef = useRef(new Set<string>());
  const tutorialClientMountsRef = useRef(new Set<string>());

  const updateWorkspaceState = useCallback(
    (
      workspaceName: string,
      update: (current: WorkspaceLearningState) => WorkspaceLearningState
    ) => {
      setWorkspaceStates((current) => {
        const currentWorkspaceState =
          current[workspaceName] ?? createWorkspaceLearningState(workspaceName);
        const next = {
          ...current,
          [workspaceName]: update(currentWorkspaceState),
        };
        workspaceStatesRef.current = next;
        writeWorkspaceLearningStates(next);
        return next;
      });
    },
    []
  );

  const setWorkspaceField = useCallback(
    <K extends keyof WorkspaceLearningState>(
      workspaceName: string,
      field: K,
      value: SetStateAction<WorkspaceLearningState[K]>
    ) => {
      updateWorkspaceState(workspaceName, (current) => ({
        ...current,
        [field]:
          typeof value === "function"
            ? (
                value as (
                  currentValue: WorkspaceLearningState[K]
                ) => WorkspaceLearningState[K]
              )(current[field])
            : value,
      }));
    },
    [updateWorkspaceState]
  );

  const activeWorkspaceState =
    workspaceStates[activeWorkspaceName] ??
    createWorkspaceLearningState(activeWorkspaceName);
  const {
    messages,
    patch,
    undoFiles,
    events,
    terminalLines,
    programStage,
    chainAction,
    experimentDismissed,
  } = activeWorkspaceState;

  const setMessages = useCallback(
    (value: SetStateAction<TutorMessage[]>) =>
      setWorkspaceField(activeWorkspaceNameRef.current, "messages", value),
    [setWorkspaceField]
  );
  const setPatch = useCallback(
    (value: SetStateAction<WorkspacePatch | null>) =>
      setWorkspaceField(activeWorkspaceNameRef.current, "patch", value),
    [setWorkspaceField]
  );
  const setUndoFiles = useCallback(
    (value: SetStateAction<WorkspaceLearningState["undoFiles"]>) =>
      setWorkspaceField(activeWorkspaceNameRef.current, "undoFiles", value),
    [setWorkspaceField]
  );
  const setProgramStage = useCallback(
    (value: SetStateAction<ProgramStage>) =>
      setWorkspaceField(activeWorkspaceNameRef.current, "programStage", value),
    [setWorkspaceField]
  );
  const setExperimentDismissed = useCallback(
    (value: SetStateAction<boolean>) =>
      setWorkspaceField(
        activeWorkspaceNameRef.current,
        "experimentDismissed",
        value
      ),
    [setWorkspaceField]
  );
  const addEvent = useCallback(
    (
      kind: LearningEvent["kind"],
      title: string,
      detail: string,
      status: LearningEvent["status"],
      diagnostic?: string,
      explorerUrl?: string,
      workspaceName = activeWorkspaceNameRef.current
    ) =>
      updateWorkspaceState(workspaceName, (workspaceState) => {
        const current = workspaceState.events;
        const next = createLearningEvent(
          kind,
          title,
          detail,
          status,
          diagnostic,
          explorerUrl
        );
        if (status !== "working") {
          const workingIndex = current.findIndex(
            (event) => event.kind === kind && event.status === "working"
          );
          if (workingIndex !== -1) {
            return {
              ...workspaceState,
              events: [
                next,
                ...current.filter((_, index) => index !== workingIndex),
              ].slice(0, 8),
            };
          }
        }
        return {
          ...workspaceState,
          events: [next, ...current].slice(0, 8),
        };
      }),
    [updateWorkspaceState]
  );

  const revealTutorialStage = useCallback(
    async (workspaceName: string, stage: TutorialTeachingStage) => {
      const tutorial = PgTutorial.all.find(
        (candidate) => candidate.name === workspaceName
      );
      if (!tutorial) return;

      const requestKey = `${workspaceName}:${stage}`;
      if (tutorialTeachingPromisesRef.current.has(requestKey)) return;
      tutorialTeachingPromisesRef.current.add(requestKey);

      try {
        const content = await getTutorialWorkspaceContent(tutorial);
        const teaching = createTutorialTeaching(tutorial, content);
        updateWorkspaceState(workspaceName, (workspaceState) => {
          if (
            workspaceState.messages.some(
              (message) => message.tutorialStage === stage
            )
          ) {
            return workspaceState;
          }

          const hasLearnerHistory = workspaceState.messages.some(
            (message) => message.role === "learner"
          );
          const messages =
            stage === "source" && !hasLearnerHistory
              ? workspaceState.messages.filter(
                  (message) =>
                    message.role === "system" || !!message.tutorialStage
                )
              : workspaceState.messages;
          return {
            ...workspaceState,
            messages: [
              ...messages,
              {
                id: createLearningId(),
                role: "tutor",
                text: teaching[stage],
                tutorialName: tutorial.name,
                tutorialStage: stage,
              },
            ],
          };
        });

        if (stage === "deployed") {
          const mountKey = `${workspaceName}:client`;
          if (!tutorialClientMountsRef.current.has(mountKey)) {
            tutorialClientMountsRef.current.add(mountKey);
            for (const pageIndex of teaching.clientPageIndexes) {
              await content.pages[pageIndex]?.onMount?.();
            }
          }
        }
      } finally {
        tutorialTeachingPromisesRef.current.delete(requestKey);
      }
    },
    [updateWorkspaceState]
  );

  return {
    activeWorkspaceName,
    activeWorkspaceNameRef,
    addEvent,
    chainAction,
    events,
    experimentDismissed,
    messages,
    patch,
    programStage,
    revealTutorialStage,
    setActiveWorkspaceName,
    setExperimentDismissed,
    setMessages,
    setPatch,
    setProgramStage,
    setUndoFiles,
    setWorkspaceField,
    terminalLines,
    undoFiles,
    updateWorkspaceState,
    workspaceStatesRef,
  };
};
