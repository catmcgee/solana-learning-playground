import type { LearningEvent, TutorMessage, WorkspacePatch } from "./types";

export const WORKSPACE_STATE_KEY = "solpg-learning-workspace-state-v1";

export type ProgramStage = "source" | "built" | "deployed";
export type ChainAction = "build" | "deploy" | "interact";
export type UndoFile = { path: string; content?: string };

export type WorkspaceLearningState = {
  messages: TutorMessage[];
  previousResponseId?: string;
  patch: WorkspacePatch | null;
  undoFiles: UndoFile[] | null;
  events: LearningEvent[];
  terminalLines: string[];
  programStage: ProgramStage;
  chainAction: ChainAction | null;
  experimentDismissed: boolean;
};

export type WorkspaceLearningStates = Record<string, WorkspaceLearningState>;

export const readWorkspaceLearningStates = (): WorkspaceLearningStates => {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(WORKSPACE_STATE_KEY) ?? "{}"
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([workspaceName, value]) => {
        const state = value as Partial<WorkspaceLearningState>;
        if (!state || !Array.isArray(state.messages)) return [];
        return [
          [
            workspaceName,
            {
              messages: state.messages.slice(-50),
              previousResponseId:
                typeof state.previousResponseId === "string"
                  ? state.previousResponseId
                  : undefined,
              patch: state.patch ?? null,
              undoFiles: Array.isArray(state.undoFiles)
                ? state.undoFiles
                : null,
              events: Array.isArray(state.events)
                ? state.events
                    .filter((event) => event.status !== "working")
                    .slice(0, 8)
                : [],
              terminalLines: Array.isArray(state.terminalLines)
                ? state.terminalLines.slice(-300)
                : [],
              programStage:
                state.programStage === "built" ||
                state.programStage === "deployed"
                  ? state.programStage
                  : "source",
              // A browser refresh cannot resume an in-flight request. In-app
              // navigation is handled by the live state instead.
              chainAction: null,
              experimentDismissed: !!state.experimentDismissed,
            },
          ],
        ];
      })
    );
  } catch {
    return {};
  }
};

export const writeWorkspaceLearningStates = (
  states: WorkspaceLearningStates
) => {
  const serializable = Object.fromEntries(
    Object.entries(states).map(([workspaceName, state]) => [
      workspaceName,
      {
        ...state,
        messages: state.messages.slice(-50),
        events: state.events.slice(0, 8),
        terminalLines: state.terminalLines.slice(-300),
        chainAction: null,
      },
    ])
  );

  try {
    localStorage.setItem(WORKSPACE_STATE_KEY, JSON.stringify(serializable));
  } catch {
    // Source files remain safe in IndexedDB if chat history exceeds the
    // browser's localStorage quota. Retry without the bulky reversible data.
    const compact = Object.fromEntries(
      Object.entries(serializable).map(([workspaceName, state]) => [
        workspaceName,
        {
          ...state,
          terminalLines: [],
          undoFiles: null,
          messages: state.messages.slice(-20),
        },
      ])
    );
    try {
      localStorage.setItem(WORKSPACE_STATE_KEY, JSON.stringify(compact));
    } catch {
      // Storage can be unavailable in private browsing. The live session
      // continues to work even when persistence is unavailable.
    }
  }
};
