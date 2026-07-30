import { FC, useCallback, useEffect, useReducer, useState } from "react";
import styled from "styled-components";

import InstructionInput from "./InstructionInput";
import InstructionProvider from "./InstructionProvider";
import Interaction from "../Interaction";
import Button from "../../../../../components/Button";
import Foldable from "../../../../../components/Foldable";
import { Emoji } from "../../../../../constants";
import {
  PgCommand,
  PgCommon,
  PgConnection,
  PgSettings,
  PgTerminal,
  PgTx,
} from "../../../../../utils";
import {
  IdlInstruction,
  PgProgramInteraction,
} from "../../.././../../utils/program-interaction";
import { useWallet } from "../../../../../hooks";
import { useIdl } from "../IdlProvider";

interface InstructionProps {
  idlInstruction: IdlInstruction;
  index: number;
  buttonLabel?: string;
  walletAvailable?: boolean;
  inline?: boolean;
  onSuccess?: (signature: string, instructionName: string) => void;
  onError?: (error: Error, instructionName: string) => void;
  onRunningChange?: (running: boolean) => void;
}

const Instruction: FC<InstructionProps> = ({
  index,
  idlInstruction,
  buttonLabel = "Test",
  walletAvailable,
  inline = false,
  onSuccess,
  onError,
  onRunningChange,
}) => {
  const [instruction, setInstruction] = useState(() =>
    PgProgramInteraction.getOrCreateInstruction(idlInstruction)
  );
  const [disabled, setDisabled] = useState(true);
  const [testing, setTesting] = useState(false);
  const [refreshCount, refreshFields] = useReducer((r) => r + 1, 0);

  const { idl } = useIdl();

  // Enable when there is no args and no accounts.
  //
  // This is intentionally done in a `useEffect` instead of changing the
  // setting the default value of the `disabled`'s `useState` in order to:
  // - Enable the button when `idlInstruction` changes
  // - Avoid flickering of the Test button i.e. the button renders as enabled
  // and switches to disabled state after.
  useEffect(() => {
    if (!idlInstruction.args.length && !idlInstruction.accounts.length) {
      setDisabled(false);
    }
  }, [idlInstruction]);

  // Refresh instruction in order to pass the latest generators to
  // `InstructionInput`, otherwise the initial values are being generated
  // from stale data.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const refresh = useCallback(
    PgCommon.debounce(() => setInstruction((ix) => ({ ...ix })), {
      delay: 1000,
    }),
    []
  );

  // Save instruction on change
  useEffect(
    () => PgProgramInteraction.saveInstruction(instruction),
    [instruction]
  );

  // Fill empty fields with Random generator
  const fillRandom = useCallback(() => {
    setInstruction((ix) => PgProgramInteraction.fillRandom(ix, idl));

    // Refresh fields in order to re-render mapped elements
    refreshFields();
  }, [idl]);

  // Reset the current instruction and re-crate it from default values
  const reset = useCallback(() => {
    // Reset and re-crate instruction
    setInstruction((ix) => {
      PgProgramInteraction.resetInstruction(ix);
      return PgProgramInteraction.getOrCreateInstruction(idlInstruction);
    });

    // Refresh fields in order to re-render mapped elements
    refreshFields();
  }, [idlInstruction]);

  const handleTest = async () => {
    if (testing) return;
    setTesting(true);
    onRunningChange?.(true);
    let successfulTxHash: string | undefined;
    try {
      const runTest = async () => {
        PgTerminal.println(
          PgTerminal.info(`Testing \`${instruction.name}\`...`)
        );

        try {
          const txHash = await PgCommon.transition(
            Promise.race([
              PgProgramInteraction.test(instruction),
              new Promise<never>((_, reject) =>
                window.setTimeout(
                  () =>
                    reject(
                      new Error(
                        "Surfpool did not respond within 30 seconds. Try the instruction again."
                      )
                    ),
                  30_000
                )
              ),
            ])
          );
          successfulTxHash = txHash;
          if (PgSettings.testUi.showTxDetailsInTerminal) return txHash;

          const txResult = await PgTx.confirm(txHash);
          if (txResult?.err) {
            throw new Error(`${Emoji.CROSSMARK} Test failed: ${txResult.err}`);
          }

          PgTerminal.println(
            `${Emoji.CHECKMARK_BUTTON} ${PgTerminal.success(`Test passed.`)}`
          );
        } catch (e: any) {
          if (e.message) {
            const ERRORS = [
              ["unable to infer src variant", "Enum variant not found"],
              [
                "program.methods[txVals.name] is not a function",
                "Test component is outdated",
              ],
            ];

            for (const [before, after] of ERRORS) {
              if (e.message === before) throw new Error(after);
            }
          }

          throw e;
        }
      };
      // The learning page does not mount the legacy terminal component. Run
      // the same interaction directly while still mirroring output through
      // PgTerminal, otherwise the static terminal bridge can wait forever.
      const showLogTxHash = inline
        ? await runTest()
        : await PgTerminal.process(runTest);

      if (showLogTxHash) {
        await PgCommon.sleep(
          PgConnection.current.rpcEndpoint.startsWith("https") ? 1500 : 200
        );
        await PgCommand.solana.execute("confirm", showLogTxHash, "-v");
      }

      if (successfulTxHash) {
        onSuccess?.(successfulTxHash, instruction.name);
      }
    } catch (error: any) {
      const interactionError =
        error instanceof Error
          ? error
          : new Error(error?.message || "The instruction could not run.");
      if (onError) {
        onError(interactionError, instruction.name);
      } else {
        throw interactionError;
      }
    } finally {
      setTesting(false);
      onRunningChange?.(false);
    }
  };

  const wallet = useWallet();
  const hasWallet = walletAvailable ?? !!wallet;
  const disabledReason = !hasWallet
    ? "Connect the play wallet first"
    : disabled
    ? "Complete the instruction fields first"
    : undefined;

  return (
    <InstructionProvider
      instruction={instruction}
      setInstruction={setInstruction}
    >
      <Interaction name={instruction.name} index={index}>
        <ArgsAndAccountsWrapper>
          {instruction.values.args.length > 0 && (
            <Foldable element="Args" isOpen>
              <InstructionInputsWrapper>
                {instruction.values.args.map((arg) => (
                  <InstructionInput
                    key={arg.name + refreshCount}
                    prefix="args"
                    updateInstruction={({
                      updateGenerator,
                      updateRefs,
                      checkErrors,
                    }) => {
                      updateGenerator(arg);
                      updateRefs(arg, "Arguments");
                      setDisabled(checkErrors());
                      refresh();
                    }}
                    {...arg}
                  />
                ))}
              </InstructionInputsWrapper>
            </Foldable>
          )}

          {instruction.values.accounts.length > 0 && (
            <Foldable element="Accounts" isOpen>
              <InstructionInputsWrapper>
                {instruction.values.accounts.map((acc) => (
                  <InstructionInput
                    key={acc.name + refreshCount}
                    prefix="accounts"
                    type="publicKey"
                    updateInstruction={({
                      updateGenerator,
                      updateRefs,
                      checkErrors,
                    }) => {
                      updateGenerator(acc);
                      updateRefs(acc, "Accounts");
                      setDisabled(checkErrors());
                      refresh();
                    }}
                    {...acc}
                  />
                ))}
              </InstructionInputsWrapper>
            </Foldable>
          )}
        </ArgsAndAccountsWrapper>

        <ButtonWrapper>
          <Button
            kind="primary"
            onClick={handleTest}
            disabled={!hasWallet || disabled || testing}
            title={disabledReason}
          >
            {testing ? "Running…" : buttonLabel}
          </Button>

          {(instruction.values.accounts.length > 0 ||
            instruction.values.args.length > 0) && (
            <>
              <Button onClick={fillRandom}>Fill</Button>
              <Button onClick={reset}>Reset</Button>
            </>
          )}
        </ButtonWrapper>
        {disabledReason && (
          <DisabledReason role="status">{disabledReason}</DisabledReason>
        )}
      </Interaction>
    </InstructionProvider>
  );
};

const ArgsAndAccountsWrapper = styled.div`
  padding-left: 0.25rem;

  & > div {
    margin-top: 1rem;
  }
`;

const InstructionInputsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: ${({ theme }) => theme.font.code.size.small};
`;

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
  gap: 1rem;

  & > button {
    padding: 0.5rem 1.5rem;
  }
`;

const DisabledReason = styled.p`
  margin: 0.55rem 0 0;
  color: ${({ theme }) => theme.colors.default.textSecondary};
  font-size: 0.72rem;
  text-align: center;
`;

export default Instruction;
