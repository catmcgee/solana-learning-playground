import { lazy, Suspense, useEffect, useRef, useState } from "react";

import EditorWithTabs from "../components/EditorWithTabs";
import { useBalance, useWallet } from "../hooks";
import { getCustomProgramDisplayName } from "./library-state";
import { PgProgramInfo, PgTheme, PgTutorial } from "../utils";
import { humanizeInstructionName } from "./format";
import { LEARNING_EXAMPLES } from "./examples";
import type { LearningEvent } from "./types";
import { LearningHeader } from "./LearningHeader";
import { LearningSidebar } from "./LearningSidebar";
import { ActivityTimeline, TimelineView } from "./ActivityTimeline";
import { LearningWallet } from "./LearningWallet";
import { ProgramInteraction } from "./ProgramInteraction";
import { ProgramPal } from "./ProgramPal";
import { useLearningWorkspace } from "./useLearningWorkspace";
import { useLearningNetwork } from "./useLearningNetwork";
import { readLessonProgress } from "./lesson-progress";
import { getExplorerTransactionUrl } from "./explorer-links";
import { useProgramActions } from "./useProgramActions";
import { usePanelResize } from "./usePanelResize";
import { useTutor } from "./useTutor";
import { useLearningLibrary } from "./useLearningLibrary";
import { useWorkspaceNavigation } from "./useWorkspaceNavigation";
import { usePlaygroundEvents } from "./usePlaygroundEvents";
import { ProgramActionStrip } from "./ProgramActionStrip";
import { LearningExperiment } from "./LearningExperiment";
import {
  Body,
  EditorFrame,
  EditorLoading,
  LearningGlobals,
  LessonHeading,
  MobileTabs,
  Shell,
  Workbench,
  WorkbenchTop,
} from "./LearningShell.styles";

const THEME_KEY = "solpg-learning-theme";
const TUTOR_WIDTH_KEY = "solpg-learning-tutor-width";
const TIMELINE_HEIGHT_KEY = "solpg-learning-timeline-height";
const MIN_TUTOR_WIDTH = 320;
const DEFAULT_TUTOR_WIDTH = 400;
const MIN_TIMELINE_HEIGHT = 150;
const DEFAULT_TIMELINE_HEIGHT = 260;
const ImportLibrary = lazy(
  () => import(/* webpackChunkName: "learning-library" */ "./ImportLibrary")
);

const LearningShell = () => {
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    if (localStorage.getItem("theme") === "Light") return "light";
    return window.matchMedia?.("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  });
  const library = useLearningLibrary();
  const {
    activeTutorial,
    customProgram,
    customPrograms,
    importedExampleIds,
    importedProgramRepos,
    importedTutorialNames,
    initialWorkspaceName,
    isTutorialWorkspace,
    lesson,
    lessonId,
    libraryTab,
    programs,
    ready,
    setImportedExampleIds,
    setImportedTutorialNames,
    setLibraryTab,
  } = library;
  const {
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
  } = useLearningWorkspace(initialWorkspaceName.current);
  const [mobilePanel, setMobilePanel] = useState<"learn" | "code" | "tutor">(
    "code"
  );
  const [timelineView, setTimelineView] = useState<TimelineView>("notes");
  const [importLibraryOpen, setImportLibraryOpen] = useState(false);
  const [importLibraryMounted, setImportLibraryMounted] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(() => {
    const saved = Number(localStorage.getItem(TIMELINE_HEIGHT_KEY));
    return clampTimelineHeight(
      Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_TIMELINE_HEIGHT
    );
  });
  const activeBuildLogRef = useRef<{
    workspaceName: string;
    lines: string[];
  } | null>(null);
  const terminalOwnerRef = useRef<string | null>(null);
  const [copiedEventId, setCopiedEventId] = useState<string>();
  const [walletAddressCopied, setWalletAddressCopied] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [tutorWidth, setTutorWidth] = useState(() => {
    const saved = Number(localStorage.getItem(TUTOR_WIDTH_KEY));
    return clampTutorWidth(
      Number.isFinite(saved) ? saved : DEFAULT_TUTOR_WIDTH
    );
  });
  const wallet = useWallet();
  const walletBalance = useBalance();
  const {
    canResetNetwork,
    ensureSurfpool,
    networkBusy,
    resetNetwork,
    rpcDraft,
    rpcEndpoint,
    rpcError,
    rpcSettingsOpen,
    saveRpcEndpoint,
    setRpcDraft,
    setRpcError,
    setRpcSettingsOpen,
    surfpoolConnected,
    useDeployedSurfpool,
  } = useLearningNetwork({ addEvent, ready, setProgramStage });
  const {
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
  } = useProgramActions({
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
  });
  const {
    applyPatch,
    askTutor,
    chatInput,
    chatting,
    patchApplying,
    setChatInput,
    undoPatch,
  } = useTutor({
    activeWorkspaceNameRef,
    addEvent,
    patch,
    runBuild,
    runDeploy,
    runInteraction,
    setMessages,
    setMobilePanel,
    setPatch,
    setProgramStage,
    setUndoFiles,
    setWorkspaceField,
    undoFiles,
    workspaceStatesRef,
  });
  const {
    selectCustomProgram,
    selectLesson,
    selectProgram,
    selectTutorial,
    startNewProgram,
  } = useWorkspaceNavigation({
    chainActionRef,
    library,
    setChatInput,
    setInteractionOpen,
    setMobilePanel,
    setWalletOpen,
    workspace: {
      activeWorkspaceNameRef,
      addEvent,
      setActiveWorkspaceName,
      updateWorkspaceState,
      workspaceStatesRef,
    },
  });
  usePlaygroundEvents({
    activeBuildLogRef,
    chainActionRef,
    terminalOwnerRef,
    tutorialActive: !!activeTutorial,
    workspace: {
      activeWorkspaceName,
      activeWorkspaceNameRef,
      addEvent,
      programStage,
      revealTutorialStage,
      setWorkspaceField,
    },
  });

  useEffect(() => {
    localStorage.setItem(TUTOR_WIDTH_KEY, String(tutorWidth));
  }, [tutorWidth]);

  useEffect(() => {
    localStorage.setItem(TIMELINE_HEIGHT_KEY, String(timelineHeight));
  }, [timelineHeight]);

  useEffect(() => {
    const keepPanelsOnScreen = () => {
      setTutorWidth((current) => clampTutorWidth(current));
      setTimelineHeight((current) => clampTimelineHeight(current));
    };
    window.addEventListener("resize", keepPanelsOnScreen);
    return () => window.removeEventListener("resize", keepPanelsOnScreen);
  }, []);

  useEffect(() => {
    setWalletOpen(false);
  }, [lessonId, customProgram]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, themeMode);
    PgTheme.set({
      themeName: themeMode === "dark" ? "Playground" : "Light",
    }).catch(() => undefined);
  }, [themeMode]);

  useEffect(() => {
    const { dispose } = PgTheme.onDidChangeThemeName((themeName) => {
      setThemeMode(themeName === "Light" ? "light" : "dark");
    });
    return dispose;
  }, []);

  const {
    resizeWithKeyboard: resizeTutorWithKeyboard,
    startResize: startTutorResize,
  } = usePanelResize({
    axis: "x",
    decreaseKey: "ArrowRight",
    getMax: getMaxTutorWidth,
    increaseKey: "ArrowLeft",
    min: MIN_TUTOR_WIDTH,
    resizeCursor: "col-resize",
    setSize: setTutorWidth,
    size: tutorWidth,
  });
  const {
    resizeWithKeyboard: resizeTimelineWithKeyboard,
    startResize: startTimelineResize,
  } = usePanelResize({
    axis: "y",
    decreaseKey: "ArrowDown",
    getMax: getMaxTimelineHeight,
    increaseKey: "ArrowUp",
    min: MIN_TIMELINE_HEIGHT,
    resizeCursor: "row-resize",
    setSize: setTimelineHeight,
    size: timelineHeight,
  });

  const copyDiagnostic = async (event: LearningEvent) => {
    if (!event.diagnostic) return;
    await copyText(event.diagnostic);
    setCopiedEventId(event.id);
    window.setTimeout(
      () =>
        setCopiedEventId((current) =>
          current === event.id ? undefined : current
        ),
      1800
    );
  };

  const copyWalletAddress = async () => {
    if (!wallet) return;
    await copyText(wallet.publicKey.toBase58());
    setWalletAddressCopied(true);
    window.setTimeout(() => setWalletAddressCopied(false), 1600);
  };

  const explainEvent = (event: LearningEvent) => {
    setTimelineView("notes");
    askTutor(
      [
        "Explain this note in beginner-friendly language.",
        `Status: ${event.status}`,
        `Title: ${event.title}`,
        `Details: ${event.detail}`,
        event.diagnostic
          ? `Technical output:\n\`\`\`\n${event.diagnostic.slice(
              -12000
            )}\n\`\`\``
          : "",
        event.status === "error"
          ? "Explain what went wrong and propose the smallest safe next step."
          : "Connect it to the current program and tell me what I can do next.",
      ]
        .filter(Boolean)
        .join("\n\n")
    );
  };

  const progress = readLessonProgress();
  const activeRpcUrl = surfpoolConnected ? rpcEndpoint : null;
  const activeExplorerUrl = activeRpcUrl
    ? `https://explorer.solana.com${
        programStage === "deployed" && PgProgramInfo.pk
          ? `/address/${PgProgramInfo.pk.toBase58()}`
          : ""
      }?cluster=custom&customUrl=${encodeURIComponent(activeRpcUrl)}`
    : null;
  const canDeploy = programStage === "built" || programStage === "deployed";
  const canInteract = programStage === "deployed";
  const actionBusy = backgroundAction !== null;
  const activeCustomEntry = customProgram
    ? customPrograms.find((program) => program.workspaceName === customProgram)
    : undefined;
  const activeCustomProgramName = activeCustomEntry
    ? getCustomProgramDisplayName(activeCustomEntry)
    : undefined;
  const actionBusyTitle = backgroundAction
    ? backgroundAction.workspaceName === activeWorkspaceName
      ? `${
          backgroundAction.action[0].toUpperCase() +
          backgroundAction.action.slice(1)
        } in progress`
      : `${
          LEARNING_EXAMPLES.find(
            (example) =>
              example.workspaceName === backgroundAction.workspaceName
          )?.title ?? "Another program"
        } is ${backgroundAction.action}ing in the background`
    : undefined;

  return (
    <Shell data-theme={themeMode}>
      <LearningGlobals $mode={themeMode} />
      <LearningHeader
        activeExplorerUrl={activeExplorerUrl}
        activeRpcUrl={activeRpcUrl}
        ensureSurfpool={ensureSurfpool}
        networkBusy={networkBusy}
        rpcDraft={rpcDraft}
        rpcEndpoint={rpcEndpoint}
        rpcError={rpcError}
        rpcSettingsOpen={rpcSettingsOpen}
        saveRpcEndpoint={saveRpcEndpoint}
        setRpcDraft={setRpcDraft}
        setRpcError={setRpcError}
        setRpcSettingsOpen={setRpcSettingsOpen}
        setThemeMode={setThemeMode}
        themeMode={themeMode}
        useDeployedSurfpool={useDeployedSurfpool}
      />

      <MobileTabs>
        {(["learn", "code", "tutor"] as const).map((panel) => (
          <button
            key={panel}
            className={mobilePanel === panel ? "active" : ""}
            onClick={() => setMobilePanel(panel)}
          >
            {panel}
          </button>
        ))}
      </MobileTabs>

      <Body $tutorWidth={tutorWidth}>
        <LearningSidebar
          customProgram={customProgram}
          customPrograms={customPrograms}
          importedExampleIds={importedExampleIds}
          importedProgramRepos={importedProgramRepos}
          importedTutorialNames={importedTutorialNames}
          lessonId={lessonId}
          libraryTab={libraryTab}
          mobilePanel={mobilePanel}
          programs={programs}
          progress={progress}
          selectCustomProgram={selectCustomProgram}
          selectLesson={selectLesson}
          selectProgram={selectProgram}
          selectTutorial={selectTutorial}
          setImportLibraryMounted={setImportLibraryMounted}
          setImportLibraryOpen={setImportLibraryOpen}
          setLibraryTab={setLibraryTab}
        />

        <Workbench
          visible={mobilePanel === "code"}
          $timelineHeight={timelineHeight}
          $showExperiment={!experimentDismissed && !isTutorialWorkspace}
        >
          <WorkbenchTop>
            <LessonHeading>
              <span>
                {customProgram
                  ? PgTutorial.isWorkspaceTutorial(customProgram)
                    ? "TUTORIAL"
                    : activeCustomEntry
                    ? "MY CUSTOM PROGRAM"
                    : "OPEN WORKSPACE"
                  : `LESSON ${String(lesson.order).padStart(2, "0")}`}
              </span>
              <h2>
                {customProgram && PgTutorial.isWorkspaceTutorial(customProgram)
                  ? customProgram
                  : activeCustomEntry
                  ? activeCustomProgramName
                  : customProgram
                  ? "Your guided program"
                  : lesson.title}
              </h2>
            </LessonHeading>
            <ProgramActionStrip
              actionBusy={actionBusy}
              actionBusyTitle={actionBusyTitle}
              canDeploy={canDeploy}
              canInteract={canInteract}
              chainAction={chainAction}
              runBuild={runBuild}
              runDeploy={runDeploy}
              runOpenInteraction={runOpenInteraction}
              surfpoolConnected={surfpoolConnected}
            />
          </WorkbenchTop>

          <EditorFrame ready={ready}>
            {ready ? (
              <EditorWithTabs
                onWalletClick={() => setWalletOpen((current) => !current)}
              />
            ) : (
              <EditorLoading>Opening workspace…</EditorLoading>
            )}
          </EditorFrame>

          {!experimentDismissed && !isTutorialWorkspace && (
            <LearningExperiment
              askTutor={askTutor}
              customProgram={customProgram}
              experiment={lesson.experiment}
              onDismiss={() => setExperimentDismissed(true)}
            />
          )}

          <ActivityTimeline
            canResetNetwork={canResetNetwork}
            chatting={chatting}
            copiedEventId={copiedEventId}
            copyDiagnostic={copyDiagnostic}
            events={events}
            explainEvent={explainEvent}
            maxHeight={getMaxTimelineHeight()}
            minHeight={MIN_TIMELINE_HEIGHT}
            networkBusy={networkBusy}
            resetNetwork={resetNetwork}
            resizeTimelineWithKeyboard={resizeTimelineWithKeyboard}
            setTimelineView={setTimelineView}
            startTimelineResize={startTimelineResize}
            terminalLines={terminalLines}
            timelineHeight={timelineHeight}
            timelineView={timelineView}
          />

          {walletOpen && wallet && (
            <LearningWallet
              activeRpcUrl={activeRpcUrl}
              address={wallet.publicKey.toBase58()}
              close={() => setWalletOpen(false)}
              copyAddress={copyWalletAddress}
              copied={walletAddressCopied}
              rpcEndpoint={rpcEndpoint}
              walletBalance={walletBalance}
            />
          )}

          {interactionOpen && interactionIdl && (
            <ProgramInteraction
              actionBusy={actionBusy}
              chainAction={chainAction}
              explorerUrlForSignature={getExplorerTransactionUrl}
              idl={interactionIdl}
              onClose={() => setInteractionOpen(false)}
              onInstructionError={(error, instructionName) => {
                addEvent(
                  "instruction",
                  `${humanizeInstructionName(instructionName)} failed`,
                  error.message,
                  "error",
                  error.message,
                  undefined,
                  activeWorkspaceName
                );
                setTimelineView("notes");
              }}
              onInstructionSuccess={recordInstructionSuccess}
              onRunTests={() => void runInteraction()}
              onRunningChange={(running) =>
                setInlineInteractionRunning(activeWorkspaceName, running)
              }
              receipt={interactionReceipt}
              rpcEndpoint={rpcEndpoint}
              walletAvailable={surfpoolConnected}
            />
          )}
        </Workbench>

        <ProgramPal
          actionBusy={actionBusy}
          applyPatch={() => void applyPatch()}
          askTutor={(prompt) => void askTutor(prompt)}
          canUndo={!!undoFiles}
          chainAction={chainAction}
          chatInput={chatInput}
          chatting={chatting}
          messages={messages}
          minWidth={MIN_TUTOR_WIDTH}
          mobilePanel={mobilePanel}
          onBuild={() => void runBuild()}
          onDeploy={() => void runDeploy()}
          onInteract={() => void runOpenInteraction()}
          patch={patch}
          patchApplying={patchApplying}
          programStage={programStage}
          rejectPatch={() => setPatch(null)}
          resizeTutorWithKeyboard={resizeTutorWithKeyboard}
          setChatInput={setChatInput}
          startTutorResize={startTutorResize}
          submitChat={() => void askTutor(chatInput)}
          tutorMaxWidth={getMaxTutorWidth()}
          tutorWidth={tutorWidth}
          undoPatch={(messageId) => void undoPatch(messageId)}
        />
      </Body>
      {importLibraryMounted && (
        <Suspense fallback={null}>
          <ImportLibrary
            open={importLibraryOpen}
            initialTab={libraryTab}
            examples={LEARNING_EXAMPLES}
            programs={programs}
            tutorials={PgTutorial.all}
            importedExampleIds={importedExampleIds}
            importedProgramRepos={importedProgramRepos}
            importedTutorialNames={importedTutorialNames}
            onClose={() => setImportLibraryOpen(false)}
            onImportExample={async (example) => {
              setImportedExampleIds((current) =>
                current.includes(example.id)
                  ? current
                  : [...current, example.id]
              );
              await selectLesson(example);
              setImportLibraryOpen(false);
            }}
            onImportProgram={async (program) => {
              await selectProgram(program);
              setImportLibraryOpen(false);
            }}
            onImportTutorial={async (tutorial) => {
              setImportedTutorialNames((current) =>
                current.includes(tutorial.name)
                  ? current
                  : [...current, tutorial.name]
              );
              await selectTutorial(tutorial);
              setImportLibraryOpen(false);
            }}
            onStartFromScratch={async () => {
              await startNewProgram();
              setImportLibraryOpen(false);
            }}
          />
        </Suspense>
      )}
    </Shell>
  );
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // The Clipboard API needs a secure context; fall back to execCommand.
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
};

const getMaxTutorWidth = () =>
  Math.max(MIN_TUTOR_WIDTH, Math.floor(window.innerWidth * 0.5));

const clampTutorWidth = (width: number) =>
  Math.min(getMaxTutorWidth(), Math.max(MIN_TUTOR_WIDTH, Math.round(width)));

const getMaxTimelineHeight = () =>
  Math.max(MIN_TIMELINE_HEIGHT, Math.floor(window.innerHeight * 0.42));

const clampTimelineHeight = (height: number) =>
  Math.min(
    getMaxTimelineHeight(),
    Math.max(MIN_TIMELINE_HEIGHT, Math.round(height))
  );

export default LearningShell;
