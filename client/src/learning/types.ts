export type LearningSession = {
  token: string;
  aiDailyLimit: number;
  surfpoolLimit: number;
};

export type SurfpoolSession = {
  id: string;
  rpcPath: string;
  wsPath: string;
};

export type TutorMessage = {
  id: string;
  role: "learner" | "tutor" | "system";
  text: string;
  streaming?: boolean;
  tutorialName?: string;
  tutorialStage?: "source" | "built" | "deployed";
  action?: "undo-workspace-change";
  actionAvailable?: boolean;
};

export type WorkspacePatch = {
  title: string;
  explanation: string;
  learningObjective: string;
  files: Array<{ path: string; content: string }>;
};

export type TutorToolCall = {
  callId: string;
  name:
    | "propose_workspace_patch"
    | "build_program"
    | "deploy_program"
    | "run_instruction";
  arguments: Record<string, any>;
};

export type LearningEvent = {
  id: string;
  kind: "network" | "build" | "deploy" | "instruction" | "idea";
  title: string;
  detail: string;
  diagnostic?: string;
  explorerUrl?: string;
  status: "idle" | "working" | "success" | "error";
  time: number;
};
