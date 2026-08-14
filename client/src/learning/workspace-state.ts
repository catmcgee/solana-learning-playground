import type { LearningEvent, TutorMessage, WorkspacePatch } from "./types";
import { LEARNING_EXAMPLES } from "./examples";

const WORKSPACE_STATE_KEY = "solpg-learning-workspace-state-v1";

export type ProgramStage = "source" | "built" | "deployed";
export type ChainAction = "build" | "deploy" | "interact";
type UndoFile = { path: string; content?: string };

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

export const createLearningId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const createLearningEvent = (
  kind: LearningEvent["kind"],
  title: string,
  detail: string,
  status: LearningEvent["status"],
  diagnostic?: string,
  explorerUrl?: string
): LearningEvent => ({
  id: createLearningId(),
  kind,
  title,
  detail,
  diagnostic,
  explorerUrl,
  status,
  time: Date.now(),
});

export const createWorkspaceLearningState = (
  workspaceName: string
): WorkspaceLearningState => {
  const lesson = LEARNING_EXAMPLES.find(
    (example) => example.workspaceName === workspaceName
  );
  const messages: TutorMessage[] = lesson
    ? [
        {
          id: createLearningId(),
          role: "tutor",
          text: `Welcome to **${lesson.title}**. ${lesson.description}\n\nI can explain any line, change the program with you, or drive the build → deploy → interact loop. You will always preview code edits before they land.`,
        },
      ]
    : [
        {
          id: createLearningId(),
          role: "tutor",
          text: "This is your new program. Tell me what you want to make—even a rough idea is enough. I’ll turn it into small, explainable steps and propose every code change for review.",
        },
      ];

  return {
    messages,
    previousResponseId: undefined,
    patch: null,
    undoFiles: null,
    events: [
      createLearningEvent(
        "network",
        "Surfpool connection",
        "Connecting to the deployed learning network.",
        "idle"
      ),
    ],
    terminalLines: [],
    programStage: "source",
    chainAction: null,
    experimentDismissed: false,
  };
};

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
