import { ActionButton, ActionHint, ActionStrip } from "./LearningShell.styles";

interface ProgramActionStripProps {
  actionBusy: boolean;
  actionBusyTitle?: string;
  canDeploy: boolean;
  canInteract: boolean;
  chainAction: "build" | "deploy" | "interact" | null;
  runBuild: () => Promise<unknown>;
  runDeploy: () => Promise<unknown>;
  runOpenInteraction: () => Promise<unknown>;
  surfpoolConnected: boolean;
}

export const ProgramActionStrip = ({
  actionBusy,
  actionBusyTitle,
  canDeploy,
  canInteract,
  chainAction,
  runBuild,
  runDeploy,
  runOpenInteraction,
  surfpoolConnected,
}: ProgramActionStripProps) => (
  <ActionStrip>
    <ActionButton
      onClick={() => void runBuild()}
      disabled={actionBusy}
      $active={!actionBusy}
      title={
        actionBusyTitle ?? "Compile the program — Surfpool is not required"
      }
      aria-label={
        actionBusy
          ? `Build unavailable — ${actionBusyTitle}`
          : "Build — Surfpool is not required"
      }
    >
      <span>⌘</span> {chainAction === "build" ? "Building…" : "Build"}
    </ActionButton>
    <ActionHint
      title={
        actionBusyTitle ??
        (canDeploy
          ? surfpoolConnected
            ? "Deploy to Surfpool"
            : "Connects to Surfpool, then deploys"
          : "Build first")
      }
    >
      <ActionButton
        onClick={() => void runDeploy()}
        disabled={actionBusy || !canDeploy}
        $active={!actionBusy && canDeploy}
        aria-label={
          actionBusy
            ? `Deploy unavailable — ${actionBusyTitle}`
            : canDeploy
            ? "Deploy"
            : "Deploy — Build first"
        }
      >
        <span>↗</span> {chainAction === "deploy" ? "Deploying…" : "Deploy"}
      </ActionButton>
    </ActionHint>
    <ActionHint
      title={actionBusyTitle ?? (canInteract ? undefined : "Deploy first")}
    >
      <ActionButton
        onClick={() => void runOpenInteraction()}
        disabled={actionBusy || !canInteract}
        $active={!actionBusy && canInteract}
        aria-label={
          actionBusy
            ? `Interact unavailable — ${actionBusyTitle}`
            : canInteract
            ? "Interact"
            : "Interact — Deploy first"
        }
      >
        <span>◎</span>{" "}
        {chainAction === "interact" ? "Interacting…" : "Interact"}
      </ActionButton>
    </ActionHint>
  </ActionStrip>
);
