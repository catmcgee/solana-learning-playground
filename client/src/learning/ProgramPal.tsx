import type {
  Dispatch,
  KeyboardEvent,
  PointerEvent,
  SetStateAction,
} from "react";

import Markdown from "../components/Markdown";
import { PgCommon } from "../utils";
import type { TutorMessage, WorkspacePatch } from "./types";
import type { ChainAction, ProgramStage } from "./workspace-state";
import {
  Composer,
  ComposerFooter,
  Kicker,
  LearningObjective,
  Message,
  MessageRole,
  Messages,
  PatchActions,
  PatchCard,
  PatchFiles,
  PrimaryButton,
  QuickPrompts,
  TutorHeader,
  TutorIdentity,
  TutorOrb,
  TutorPanel,
  TutorResizeHandle,
  TutorialMessageAction,
  TutorialStageMeta,
  TypingStatus,
  UndoCard,
} from "./LearningShell.styles";

type ProgramPalProps = {
  actionBusy: boolean;
  applyPatch: () => void;
  askTutor: (prompt: string) => void;
  canUndo: boolean;
  chainAction: ChainAction | null;
  chatInput: string;
  chatting: boolean;
  mobilePanel: "learn" | "code" | "tutor";
  messages: TutorMessage[];
  minWidth: number;
  onBuild: () => void;
  onDeploy: () => void;
  onInteract: () => void;
  patch: WorkspacePatch | null;
  patchApplying: boolean;
  programStage: ProgramStage;
  rejectPatch: () => void;
  resizeTutorWithKeyboard: (event: KeyboardEvent<HTMLButtonElement>) => void;
  setChatInput: Dispatch<SetStateAction<string>>;
  startTutorResize: (event: PointerEvent<HTMLButtonElement>) => void;
  submitChat: () => void;
  tutorWidth: number;
  tutorMaxWidth: number;
  undoPatch: (messageId: string) => void;
};

export const ProgramPal = ({
  actionBusy,
  applyPatch,
  askTutor,
  canUndo,
  chainAction,
  chatInput,
  chatting,
  mobilePanel,
  messages,
  minWidth,
  onBuild,
  onDeploy,
  onInteract,
  patch,
  patchApplying,
  programStage,
  rejectPatch,
  resizeTutorWithKeyboard,
  setChatInput,
  startTutorResize,
  submitChat,
  tutorMaxWidth,
  tutorWidth,
  undoPatch,
}: ProgramPalProps) => (
  <TutorPanel id="program-pal-panel" visible={mobilePanel === "tutor"}>
    <TutorResizeHandle
      type="button"
      role="separator"
      aria-label="Resize Program Pal"
      aria-controls="program-pal-panel"
      aria-orientation="vertical"
      aria-valuemin={minWidth}
      aria-valuemax={tutorMaxWidth}
      aria-valuenow={Math.round(tutorWidth)}
      title="Drag to resize Program Pal"
      onPointerDown={startTutorResize}
      onKeyDown={resizeTutorWithKeyboard}
    />
    <TutorHeader>
      <TutorIdentity>
        <TutorOrb aria-hidden="true">●‿●</TutorOrb>
        <strong>Program Pal</strong>
      </TutorIdentity>
    </TutorHeader>

    <Messages>
      {messages.map((message) =>
        message.action === "undo-workspace-change" ? (
          <UndoCard key={message.id}>
            {message.text}
            {message.actionAvailable && canUndo && (
              <button onClick={() => undoPatch(message.id)}>Undo</button>
            )}
          </UndoCard>
        ) : (
          <Message key={message.id} role={message.role}>
            <MessageRole>
              {message.role === "learner" ? "YOU" : "PROGRAM PAL"}
            </MessageRole>
            {message.tutorialStage && (
              <TutorialStageMeta>
                <span>
                  {message.tutorialStage === "source"
                    ? "01"
                    : message.tutorialStage === "built"
                    ? "02"
                    : "03"}
                </span>
                <div>
                  <small>Tutorial path</small>
                  <strong>
                    {message.tutorialStage === "source"
                      ? "Learn & build"
                      : message.tutorialStage === "built"
                      ? "Deploy"
                      : "Client & testing"}
                  </strong>
                </div>
              </TutorialStageMeta>
            )}
            {message.role === "tutor" ? (
              <Markdown
                rootSrc={
                  message.tutorialName
                    ? `/tutorials/${PgCommon.toKebabFromTitle(
                        message.tutorialName
                      )}`
                    : undefined
                }
              >
                {message.text || "Thinking through the code…"}
              </Markdown>
            ) : (
              <p>{message.text}</p>
            )}
            {message.tutorialStage === "source" && programStage === "source" && (
              <TutorialMessageAction
                type="button"
                disabled={actionBusy}
                onClick={onBuild}
              >
                {chainAction === "build" ? "Building…" : "Build now"}
                <span>⌘</span>
              </TutorialMessageAction>
            )}
            {message.tutorialStage === "built" && programStage === "built" && (
              <TutorialMessageAction
                type="button"
                disabled={actionBusy}
                onClick={onDeploy}
              >
                {chainAction === "deploy" ? "Deploying…" : "Deploy now"}
                <span>↗</span>
              </TutorialMessageAction>
            )}
            {message.tutorialStage === "deployed" &&
              programStage === "deployed" && (
                <TutorialMessageAction
                  type="button"
                  disabled={actionBusy}
                  onClick={onInteract}
                >
                  Open Interact
                  <span>◎</span>
                </TutorialMessageAction>
              )}
            {message.streaming && <TypingStatus>Thinking…</TypingStatus>}
          </Message>
        )
      )}

      {patch && (
        <PatchCard>
          <Kicker>Check before applying</Kicker>
          <h3>{patch.title}</h3>
          <p>{patch.explanation}</p>
          <LearningObjective>
            <span>WHY</span>
            {patch.learningObjective}
          </LearningObjective>
          <PatchFiles>
            {patch.files.map((file) => (
              <div key={file.path}>
                <span>＋</span>
                <code>{file.path}</code>
                <small>{file.content.split("\n").length} lines</small>
              </div>
            ))}
          </PatchFiles>
          <PatchActions>
            <button onClick={rejectPatch}>Not now</button>
            <PrimaryButton onClick={applyPatch} disabled={patchApplying}>
              {patchApplying ? "Applying…" : "Apply change"}
            </PrimaryButton>
          </PatchActions>
        </PatchCard>
      )}
    </Messages>

    <QuickPrompts>
      <button
        onClick={() =>
          askTutor("Explain the selected file from top to bottom.")
        }
      >
        Explain this file
      </button>
      <button
        onClick={() => askTutor("What should I try next in this lesson?")}
      >
        What next?
      </button>
    </QuickPrompts>

    <Composer
      onSubmit={(event) => {
        event.preventDefault();
        submitChat();
      }}
    >
      <textarea
        value={chatInput}
        onChange={(event) => setChatInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submitChat();
          }
        }}
        placeholder="Ask about the code, or tell me what you want to make…"
        rows={3}
      />
      <ComposerFooter>
        <span>Uses current files + Surfpool state</span>
        <button disabled={chatting || !chatInput.trim()} type="submit">
          {chatting ? "…" : "↑"}
        </button>
      </ComposerFooter>
    </Composer>
  </TutorPanel>
);
