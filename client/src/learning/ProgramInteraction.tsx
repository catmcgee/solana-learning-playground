import IdlProvider from "../views/sidebar/test/Component/IdlProvider";
import Instruction from "../views/sidebar/test/Component/Instruction";
import { PgProgramInfo } from "../utils";
import type { ChainAction } from "./workspace-state";
import { formatRpcLabel, humanizeInstructionName } from "./format";
import {
  InlineInstructionList,
  InlineInteractionDrawer,
  InteractionDrawerFooter,
  InteractionDrawerHeader,
  InteractionMeta,
  InteractionReceipt,
  InteractionTestBar,
  Kicker,
} from "./LearningShell.styles";

type ProgramInteractionProps = {
  actionBusy: boolean;
  chainAction: ChainAction | null;
  explorerUrlForSignature: (signature: string) => string;
  idl: NonNullable<typeof PgProgramInfo.idl>;
  onClose: () => void;
  onInstructionError: (error: Error, instructionName: string) => void;
  onInstructionSuccess: (signature: string, instructionName: string) => void;
  onRunTests: () => void;
  onRunningChange: (running: boolean) => void;
  receipt: { signature: string; instructionName: string } | null;
  rpcEndpoint: string;
  walletAvailable: boolean;
};

export const ProgramInteraction = ({
  actionBusy,
  chainAction,
  explorerUrlForSignature,
  idl,
  onClose,
  onInstructionError,
  onInstructionSuccess,
  onRunTests,
  onRunningChange,
  receipt,
  rpcEndpoint,
  walletAvailable,
}: ProgramInteractionProps) => (
  <InlineInteractionDrawer
    aria-label="Program interaction panel"
    aria-live="polite"
  >
    <InteractionDrawerHeader>
      <div>
        <Kicker>Onchain controls</Kicker>
        <h3>Try {idl.name}</h3>
        <p>
          These controls come directly from the generated IDL. Open an
          instruction to see its arguments and accounts.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close interaction panel"
        title="Close interaction panel"
      >
        ×
      </button>
    </InteractionDrawerHeader>

    <InteractionMeta>
      <strong>
        {idl.instructions.length} callable instruction
        {idl.instructions.length === 1 ? "" : "s"}
      </strong>
      <span>Connected to {formatRpcLabel(rpcEndpoint)}</span>
    </InteractionMeta>

    <InteractionTestBar>
      <div>
        <Kicker>Tutorial client</Kicker>
        <strong>Run the workspace tests</strong>
        <span>
          Execute the current test files against this deployed program and
          follow every transaction in Notes.
        </span>
      </div>
      <button type="button" disabled={actionBusy} onClick={onRunTests}>
        {chainAction === "interact" ? "Testing…" : "Run tests"}
      </button>
    </InteractionTestBar>

    {receipt && (
      <InteractionReceipt>
        <span>Transaction confirmed</span>
        <strong>{humanizeInstructionName(receipt.instructionName)}</strong>
        <a
          href={explorerUrlForSignature(receipt.signature)}
          target="_blank"
          rel="noreferrer"
        >
          View in Explorer ↗
        </a>
      </InteractionReceipt>
    )}

    <InlineInstructionList>
      <IdlProvider idl={idl}>
        {idl.instructions.map((idlInstruction, index) => (
          <Instruction
            key={JSON.stringify(idlInstruction)}
            index={index}
            idlInstruction={idlInstruction}
            buttonLabel="Run instruction"
            walletAvailable={walletAvailable}
            inline
            onRunningChange={onRunningChange}
            onSuccess={onInstructionSuccess}
            onError={onInstructionError}
          />
        ))}
      </IdlProvider>
    </InlineInstructionList>

    <InteractionDrawerFooter>
      Every successful run creates a real Surfpool transaction and an Explorer
      link.
    </InteractionDrawerFooter>
  </InlineInteractionDrawer>
);
