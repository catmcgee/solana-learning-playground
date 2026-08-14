import type { MutableRefObject } from "react";
import { useEffect } from "react";

import {
  PgCodec,
  PgCommand,
  PgExplorer,
  PgProgramInfo,
  PgTerminal,
  PgTx,
  PgWeb3,
} from "../utils";
import {
  getExplorerAddressUrl,
  getExplorerTransactionUrl,
} from "./explorer-links";
import { cleanTerminalOutput } from "./format";
import { shortAddress } from "./useLearningNetwork";
import type { useLearningWorkspace } from "./useLearningWorkspace";
import type { useProgramActions } from "./useProgramActions";

type Workspace = Pick<
  ReturnType<typeof useLearningWorkspace>,
  | "activeWorkspaceName"
  | "activeWorkspaceNameRef"
  | "addEvent"
  | "programStage"
  | "revealTutorialStage"
  | "setWorkspaceField"
>;

interface PlaygroundEventsParams {
  activeBuildLogRef: MutableRefObject<{
    workspaceName: string;
    lines: string[];
  } | null>;
  chainActionRef: ReturnType<typeof useProgramActions>["chainActionRef"];
  terminalOwnerRef: MutableRefObject<string | null>;
  tutorialActive: boolean;
  workspace: Workspace;
}

/** Bridge legacy Playground events into the learning workspace state. */
export const usePlaygroundEvents = ({
  activeBuildLogRef,
  chainActionRef,
  terminalOwnerRef,
  tutorialActive,
  workspace,
}: PlaygroundEventsParams) => {
  const {
    activeWorkspaceName,
    activeWorkspaceNameRef,
    addEvent,
    programStage,
    revealTutorialStage,
    setWorkspaceField,
  } = workspace;

  useEffect(() => {
    if (!tutorialActive) return;
    const reveal = async () => {
      await revealTutorialStage(activeWorkspaceName, "source");
      if (programStage === "built" || programStage === "deployed") {
        await revealTutorialStage(activeWorkspaceName, "built");
      }
      if (programStage === "deployed") {
        await revealTutorialStage(activeWorkspaceName, "deployed");
      }
    };
    void reveal();
  }, [activeWorkspaceName, programStage, revealTutorialStage, tutorialActive]);

  useEffect(() => {
    const { dispose } = PgTerminal.onDidPrint((message) => {
      const lines = cleanTerminalOutput(message);
      if (!lines.length) return;

      const workspaceName =
        terminalOwnerRef.current ?? activeWorkspaceNameRef.current;
      if (activeBuildLogRef.current?.workspaceName === workspaceName) {
        activeBuildLogRef.current.lines = [
          ...activeBuildLogRef.current.lines,
          ...lines,
        ].slice(-300);
      }
      setWorkspaceField(workspaceName, "terminalLines", (current) =>
        [...current, ...lines].slice(-300)
      );
    });
    return dispose;
  }, [
    activeBuildLogRef,
    activeWorkspaceNameRef,
    setWorkspaceField,
    terminalOwnerRef,
  ]);

  useEffect(() => {
    const build = PgCommand.build.onDidFinish((result) => {
      const workspaceName = PgExplorer.currentWorkspaceName;
      if (!workspaceName) return;
      const failed = !!result.err || !!result.ok?.failed;
      setWorkspaceField(
        workspaceName,
        "programStage",
        failed ? "source" : "built"
      );
      if (chainActionRef.current?.action === "build") return;

      addEvent(
        "build",
        failed ? "Build failed" : "Build complete",
        failed
          ? result.err?.message ??
              "The compiler found an issue in the current program."
          : "The program binary and generated IDL are ready.",
        failed ? "error" : "success",
        failed ? result.err?.message ?? result.ok?.stderr : undefined,
        undefined,
        workspaceName
      );
    });
    const deploy = PgCommand.deploy.onDidFinish((result) => {
      const workspaceName = PgExplorer.currentWorkspaceName;
      if (!workspaceName || chainActionRef.current?.action === "deploy") {
        return;
      }
      if (result.err) {
        addEvent(
          "deploy",
          "Deployment failed",
          result.err.message,
          "error",
          result.err.message,
          undefined,
          workspaceName
        );
        return;
      }

      setWorkspaceField(workspaceName, "programStage", "deployed");
      const address = PgProgramInfo.pk?.toBase58();
      addEvent(
        "deploy",
        "Program is onchain",
        address
          ? `Program ${shortAddress(address)} is executable on Surfpool.`
          : "The program is executable on Surfpool.",
        "success",
        undefined,
        address ? getExplorerAddressUrl(address) : undefined,
        workspaceName
      );
    });
    return () => {
      build.dispose();
      deploy.dispose();
    };
  }, [addEvent, chainActionRef, setWorkspaceField]);

  useEffect(() => {
    const { dispose } = PgTx.onDidSend((transaction) => {
      if (
        chainActionRef.current ||
        transaction.instructions.some((instruction) =>
          instruction.programId.equals(
            PgWeb3.BpfLoaderUpgradeableProgram.programId
          )
        ) ||
        !transaction.signature
      ) {
        return;
      }

      const signature = PgCodec.encodeBinary(transaction.signature, "base58");
      addEvent(
        "instruction",
        "Transaction submitted",
        "The network accepted a transaction from an advanced Playground tool.",
        "success",
        undefined,
        getExplorerTransactionUrl(signature)
      );
    });
    return dispose;
  }, [addEvent, chainActionRef]);
};
