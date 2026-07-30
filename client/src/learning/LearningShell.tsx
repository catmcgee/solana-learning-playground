import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";

import EditorWithTabs from "../components/EditorWithTabs";
import Markdown from "../components/Markdown";
import { buildCurrentProgram } from "../commands/build/build";
import { SURFPOOL_RPC_URL } from "../constants";
import { useBalance, useWallet } from "../hooks";
import ImportLibrary, { LearningLibraryTab } from "./ImportLibrary";
import {
  CUSTOM_WORKSPACE_KEY,
  getTutorialWorkspaceContent,
  loadTutorialWorkspace,
} from "./tutorial-workspace";
import {
  CustomProgramEntry,
  readCustomPrograms,
  readImportedExampleIds,
  readImportedProgramRepos,
  readImportedTutorialNames,
  renameCustomProgram,
  writeCustomPrograms,
  writeImportedExampleIds,
  writeImportedProgramRepos,
  writeImportedTutorialNames,
} from "./library-state";
import {
  getProgramWorkspaceName,
  loadProgramCatalog,
  ProgramEntry,
} from "./program-catalog";
import {
  createTutorialTeaching,
  TutorialTeachingStage,
} from "./tutorial-teaching";
import IdlProvider from "../views/sidebar/test/Component/IdlProvider";
import Instruction from "../views/sidebar/test/Component/Instruction";
import {
  PgCommand,
  PgCodec,
  PgCommon,
  PgConnection,
  PgExplorer,
  PgGithub,
  PgProgramInfo,
  PgSettings,
  PgTerminal,
  PgTheme,
  PgTutorial,
  PgTx,
  PgWallet,
  PgWeb3,
  TutorialData,
} from "../utils";
import {
  getLearningExample,
  LEARNING_EXAMPLES,
  readWorkspaceLearningStates,
  streamTutor,
  writeWorkspaceLearningStates,
} from ".";
import type {
  ChainAction,
  LearningEvent,
  LearningExample,
  ProgramStage,
  TutorMessage,
  TutorToolCall,
  WorkspaceLearningState,
  WorkspaceLearningStates,
  WorkspacePatch,
} from ".";

const ACTIVE_LESSON_KEY = "solpg-learning-active-lesson";
const PROGRESS_KEY = "solpg-learning-progress";
const SURFPOOL_KEY = "solpg-learning-surfpool";
const SURFPOOL_WALLET_KEY = "solpg-learning-surfpool-keypair";
const CUSTOM_RPC_KEY = "solpg-learning-rpc-endpoint-v1";
const THEME_KEY = "solpg-learning-theme";
const TUTOR_WIDTH_KEY = "solpg-learning-tutor-width";
const TIMELINE_HEIGHT_KEY = "solpg-learning-timeline-height";
const SURFPOOL_WALLET_NAME = "Surfpool wallet";
const LEARNING_BUILD_SERVER_URL =
  process.env.REACT_APP_SERVER_URL?.trim() ||
  "https://solana-learning-playground-api-597771376676.us-central1.run.app";
const MIN_TUTOR_WIDTH = 320;
const DEFAULT_TUTOR_WIDTH = 400;
const MIN_TIMELINE_HEIGHT = 150;
const DEFAULT_TIMELINE_HEIGHT = 260;
const LIBRARY_TAB_KEY = "solpg-learning-library-tab";
type TimelineView = "notes" | "verbose";

const LearningShell = () => {
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    if (localStorage.getItem("theme") === "Light") return "light";
    return window.matchMedia?.("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  });
  const [lessonId, setLessonId] = useState<LearningExample["id"]>(() => {
    const saved = localStorage.getItem(ACTIVE_LESSON_KEY);
    return LEARNING_EXAMPLES.some((example) => example.id === saved)
      ? (saved as LearningExample["id"])
      : "hello-solana";
  });
  const lesson = getLearningExample(lessonId);
  const initialLessonId = useRef(lessonId);
  const [customProgram, setCustomProgram] = useState<string | null>(() =>
    localStorage.getItem(CUSTOM_WORKSPACE_KEY)
  );
  const initialCustomProgram = useRef(customProgram);
  const initialWorkspaceName = useRef(customProgram ?? lesson.workspaceName);
  const activeTutorial = customProgram
    ? PgTutorial.all.find((tutorial) => tutorial.name === customProgram)
    : undefined;
  const isTutorialWorkspace = !!activeTutorial;
  const [activeWorkspaceName, setActiveWorkspaceName] = useState(
    initialWorkspaceName.current
  );
  const activeWorkspaceNameRef = useRef(initialWorkspaceName.current);
  const [workspaceStates, setWorkspaceStates] =
    useState<WorkspaceLearningStates>(() => {
      const saved = readWorkspaceLearningStates();
      if (!saved[initialWorkspaceName.current]) {
        saved[initialWorkspaceName.current] = createWorkspaceLearningState(
          initialWorkspaceName.current
        );
      }
      return saved;
    });
  const workspaceStatesRef = useRef(workspaceStates);
  const [ready, setReady] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"learn" | "code" | "tutor">(
    "code"
  );
  const [timelineView, setTimelineView] = useState<TimelineView>("notes");
  const [libraryTab, setLibraryTab] = useState<LearningLibraryTab>(() => {
    const saved = localStorage.getItem(LIBRARY_TAB_KEY);
    if (saved === "tutorials" || saved === "examples") return saved;
    return isTutorialWorkspace ? "tutorials" : "examples";
  });
  const [importLibraryOpen, setImportLibraryOpen] = useState(false);
  const [importedExampleIds, setImportedExampleIds] = useState<string[]>(
    readImportedExampleIds
  );
  const [importedTutorialNames, setImportedTutorialNames] = useState<string[]>(
    readImportedTutorialNames
  );
  const [programs, setPrograms] = useState<ProgramEntry[]>([]);
  const [importedProgramRepos, setImportedProgramRepos] = useState<string[]>(
    readImportedProgramRepos
  );
  const [customPrograms, setCustomPrograms] =
    useState<CustomProgramEntry[]>(readCustomPrograms);
  const customProgramsRef = useRef(customPrograms);
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
  const [chatInput, setChatInput] = useState("");
  const [chatting, setChatting] = useState(false);
  const [networkBusy, setNetworkBusy] = useState(false);
  const [surfpoolConnected, setSurfpoolConnected] = useState(false);
  const [rpcEndpoint, setRpcEndpoint] = useState(
    () => localStorage.getItem(CUSTOM_RPC_KEY)?.trim() || SURFPOOL_RPC_URL
  );
  const [rpcDraft, setRpcDraft] = useState(rpcEndpoint);
  const [rpcSettingsOpen, setRpcSettingsOpen] = useState(false);
  const [rpcError, setRpcError] = useState("");
  const wallet = useWallet();
  const walletBalance = useBalance();
  const surfpoolConnectPromiseRef = useRef<Promise<void> | null>(null);
  const connectedRpcRef = useRef<string | null>(null);
  const [backgroundAction, setBackgroundAction] = useState<{
    action: ChainAction;
    workspaceName: string;
  } | null>(null);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [interactionIdl, setInteractionIdl] =
    useState<typeof PgProgramInfo.idl>(null);
  const [interactionReceipt, setInteractionReceipt] = useState<{
    signature: string;
    instructionName: string;
  } | null>(null);
  const chainActionRef = useRef<{
    action: ChainAction;
    workspaceName: string;
  } | null>(null);
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
        const next = createEvent(
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
                id: randomId(),
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

  useEffect(() => {
    if (!activeTutorial) return;
    const workspaceName = activeWorkspaceName;
    const reveal = async () => {
      await revealTutorialStage(workspaceName, "source");
      if (programStage === "built" || programStage === "deployed") {
        await revealTutorialStage(workspaceName, "built");
      }
      if (programStage === "deployed") {
        await revealTutorialStage(workspaceName, "deployed");
      }
    };
    void reveal();
  }, [activeTutorial, activeWorkspaceName, programStage, revealTutorialStage]);

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
  }, [setWorkspaceField]);

  useEffect(() => {
    const buildDisposable = PgCommand.build.onDidFinish((result) => {
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
    const deployDisposable = PgCommand.deploy.onDidFinish((result) => {
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
      buildDisposable.dispose();
      deployDisposable.dispose();
    };
  }, [addEvent, setWorkspaceField]);

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
  }, [addEvent]);

  useEffect(() => {
    localStorage.setItem(TUTOR_WIDTH_KEY, String(tutorWidth));
  }, [tutorWidth]);

  useEffect(() => {
    localStorage.setItem(TIMELINE_HEIGHT_KEY, String(timelineHeight));
  }, [timelineHeight]);

  useEffect(() => {
    localStorage.setItem(LIBRARY_TAB_KEY, libraryTab);
  }, [libraryTab]);

  useEffect(() => {
    writeImportedExampleIds(importedExampleIds);
  }, [importedExampleIds]);

  useEffect(() => {
    writeImportedTutorialNames(importedTutorialNames);
  }, [importedTutorialNames]);

  useEffect(() => {
    writeImportedProgramRepos(importedProgramRepos);
  }, [importedProgramRepos]);

  useEffect(() => {
    customProgramsRef.current = customPrograms;
    writeCustomPrograms(customPrograms);
  }, [customPrograms]);

  useEffect(() => {
    let active = true;
    loadProgramCatalog()
      .then((catalog) => {
        if (active) setPrograms(catalog);
      })
      .catch(() => {
        // New → Programs displays the catalog error in its own surface.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!activeTutorial) return;
    setImportedTutorialNames((current) =>
      current.includes(activeTutorial.name)
        ? current
        : [...current, activeTutorial.name]
    );
  }, [activeTutorial]);

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

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      await PgExplorer.init();
      const currentLesson = getLearningExample(initialLessonId.current);
      const savedCustom = initialCustomProgram.current;
      const availableWorkspaceNames = new Set(
        PgExplorer.allWorkspaceNames ?? []
      );
      setCustomPrograms((current) => {
        const available = current.filter((program) =>
          availableWorkspaceNames.has(program.workspaceName)
        );
        if (
          savedCustom?.startsWith("learn-my-program-") &&
          availableWorkspaceNames.has(savedCustom) &&
          !available.some((program) => program.workspaceName === savedCustom)
        ) {
          return [
            ...available,
            { workspaceName: savedCustom, createdAt: Date.now() },
          ];
        }
        return available.length === current.length ? current : available;
      });
      const hasSavedCustom =
        !!savedCustom && !!PgExplorer.allWorkspaceNames?.includes(savedCustom);
      if (savedCustom && !hasSavedCustom) {
        localStorage.removeItem(CUSTOM_WORKSPACE_KEY);
        setCustomProgram(null);
        activeWorkspaceNameRef.current = currentLesson.workspaceName;
        setActiveWorkspaceName(currentLesson.workspaceName);
      }
      if (savedCustom && hasSavedCustom) {
        await PgExplorer.switchWorkspace(savedCustom, {
          defaultOpenFile: "src/lib.rs",
        });
      } else if (
        !PgExplorer.allWorkspaceNames?.includes(currentLesson.workspaceName)
      ) {
        await PgExplorer.createWorkspace(currentLesson.workspaceName, {
          files: currentLesson.files,
          defaultOpenFile: "src/lib.rs",
        });
      } else if (
        PgExplorer.currentWorkspaceName !== currentLesson.workspaceName
      ) {
        await PgExplorer.switchWorkspace(currentLesson.workspaceName, {
          defaultOpenFile: "src/lib.rs",
        });
      }
      if (active) setReady(true);
    };
    initialize().catch((error) => {
      addEvent("build", "Could not open the lesson", error.message, "error");
    });
    return () => {
      active = false;
    };
  }, [addEvent]); // Initialize once; lesson switching is handled explicitly.

  useEffect(() => {
    const syncWorkspace = () => {
      const workspaceName = PgExplorer.currentWorkspaceName;
      if (!workspaceName || workspaceName === activeWorkspaceNameRef.current) {
        return;
      }
      const previousWorkspaceName = activeWorkspaceNameRef.current;
      const previousWasCustom = customProgramsRef.current.some(
        (program) => program.workspaceName === previousWorkspaceName
      );
      const previousStillExists = PgExplorer.allWorkspaceNames?.includes(
        previousWorkspaceName
      );
      if (previousWasCustom && !previousStillExists) {
        setCustomPrograms((current) =>
          renameCustomProgram(current, previousWorkspaceName, workspaceName)
        );
      }
      const workspaceLesson = LEARNING_EXAMPLES.find(
        (example) => example.workspaceName === workspaceName
      );
      activeWorkspaceNameRef.current = workspaceName;
      setActiveWorkspaceName(workspaceName);
      if (workspaceLesson) {
        localStorage.setItem(ACTIVE_LESSON_KEY, workspaceLesson.id);
        localStorage.removeItem(CUSTOM_WORKSPACE_KEY);
        setLessonId(workspaceLesson.id);
        setCustomProgram(null);
        setLibraryTab("examples");
      } else {
        localStorage.setItem(CUSTOM_WORKSPACE_KEY, workspaceName);
        setCustomProgram(workspaceName);
        setLibraryTab(
          PgTutorial.isWorkspaceTutorial(workspaceName)
            ? "tutorials"
            : "examples"
        );
      }
      if (!workspaceStatesRef.current[workspaceName]) {
        updateWorkspaceState(workspaceName, () =>
          createWorkspaceLearningState(workspaceName)
        );
      }
      setInteractionOpen(false);
      setWalletOpen(false);
      setReady(true);
    };

    const { dispose } = PgExplorer.onDidSwitchWorkspace(syncWorkspace);
    return dispose;
  }, [updateWorkspaceState]);

  useEffect(() => {
    const removeDeletedCustomPrograms = () => {
      const available = new Set(PgExplorer.allWorkspaceNames ?? []);
      setCustomPrograms((current) => {
        const next = current.filter((program) =>
          available.has(program.workspaceName)
        );
        return next.length === current.length ? current : next;
      });
    };
    const { dispose } = PgExplorer.onDidDeleteWorkspace(
      removeDeletedCustomPrograms
    );
    return dispose;
  }, []);

  const selectLesson = async (next: LearningExample) => {
    if (next.id === lessonId && !customProgram) return;
    if (chainActionRef.current && chainActionRef.current.action !== "build") {
      addEvent(
        chainActionRef.current.action === "deploy" ? "deploy" : "instruction",
        "Finish the current action first",
        "You can switch lessons while a build runs. Deploy and interaction stay on this page so wallet and program state cannot cross workspaces.",
        "idle"
      );
      return;
    }
    setReady(false);
    if (!PgExplorer.allWorkspaceNames?.includes(next.workspaceName)) {
      await PgExplorer.createWorkspace(next.workspaceName, {
        files: next.files,
        defaultOpenFile: "src/lib.rs",
      });
    } else {
      await PgExplorer.switchWorkspace(next.workspaceName, {
        defaultOpenFile: "src/lib.rs",
      });
    }
    localStorage.setItem(ACTIVE_LESSON_KEY, next.id);
    localStorage.removeItem(CUSTOM_WORKSPACE_KEY);
    setImportedExampleIds((current) =>
      current.includes(next.id) ? current : [...current, next.id]
    );
    setCustomProgram(null);
    setLessonId(next.id);
    setLibraryTab("examples");
    activeWorkspaceNameRef.current = next.workspaceName;
    setActiveWorkspaceName(next.workspaceName);
    if (!workspaceStatesRef.current[next.workspaceName]) {
      updateWorkspaceState(next.workspaceName, () =>
        createWorkspaceLearningState(next.workspaceName)
      );
    }
    setInteractionOpen(false);
    setReady(true);
    setMobilePanel("code");
  };

  const selectTutorial = async (tutorial: TutorialData) => {
    if (chainActionRef.current && chainActionRef.current.action !== "build") {
      addEvent(
        chainActionRef.current.action === "deploy" ? "deploy" : "instruction",
        "Finish the current action first",
        "You can open another workspace while a build runs. Deploy and interaction stay attached to their current workspace.",
        "idle"
      );
      return;
    }

    setReady(false);
    try {
      const workspaceName = await loadTutorialWorkspace(tutorial);
      localStorage.setItem(CUSTOM_WORKSPACE_KEY, workspaceName);
      setImportedTutorialNames((current) =>
        current.includes(tutorial.name) ? current : [...current, tutorial.name]
      );
      setCustomProgram(workspaceName);
      setLibraryTab("tutorials");
      activeWorkspaceNameRef.current = workspaceName;
      setActiveWorkspaceName(workspaceName);
      if (!workspaceStatesRef.current[workspaceName]) {
        updateWorkspaceState(workspaceName, () =>
          createWorkspaceLearningState(workspaceName)
        );
      }
      setInteractionOpen(false);
      setWalletOpen(false);
      setMobilePanel("tutor");
      addEvent(
        "idea",
        `${tutorial.name} opened`,
        "Its files are ready in the Playground. Edit, build, deploy, or ask Program Pal what to try.",
        "success",
        undefined,
        undefined,
        workspaceName
      );
    } catch (error: any) {
      addEvent(
        "build",
        `Could not open ${tutorial.name}`,
        error?.message ?? "The tutorial workspace could not be imported.",
        "error"
      );
    } finally {
      setReady(true);
    }
  };

  const selectProgram = async (program: ProgramEntry) => {
    if (chainActionRef.current && chainActionRef.current.action !== "build") {
      addEvent(
        chainActionRef.current.action === "deploy" ? "deploy" : "instruction",
        "Finish the current action first",
        "You can open another program while a build runs. Deploy and interaction stay attached to their current workspace.",
        "idle"
      );
      return;
    }

    setReady(false);
    try {
      await PgGithub.import(program.repo);
      const workspaceName = getProgramWorkspaceName(program);
      localStorage.setItem(CUSTOM_WORKSPACE_KEY, workspaceName);
      setImportedProgramRepos((current) =>
        current.includes(program.repo) ? current : [...current, program.repo]
      );
      setCustomProgram(workspaceName);
      setLibraryTab("examples");
      activeWorkspaceNameRef.current = workspaceName;
      setActiveWorkspaceName(workspaceName);
      if (!workspaceStatesRef.current[workspaceName]) {
        updateWorkspaceState(workspaceName, () =>
          createWorkspaceLearningState(workspaceName)
        );
      }
      setInteractionOpen(false);
      setWalletOpen(false);
      setMobilePanel("code");
      addEvent(
        "idea",
        `${program.name} opened`,
        "The program is ready in your workspace. Explore its files, build it, or ask Program Pal where to begin.",
        "success",
        undefined,
        undefined,
        workspaceName
      );
    } catch (error: any) {
      addEvent(
        "build",
        `Could not open ${program.name}`,
        error?.message ?? "The GitHub program could not be added.",
        "error"
      );
      throw error;
    } finally {
      setReady(true);
    }
  };

  const selectCustomProgram = async (program: CustomProgramEntry) => {
    const workspaceName = program.workspaceName;
    if (workspaceName === activeWorkspaceNameRef.current) return;
    if (chainActionRef.current && chainActionRef.current.action !== "build") {
      addEvent(
        chainActionRef.current.action === "deploy" ? "deploy" : "instruction",
        "Finish the current action first",
        "You can open another program while a build runs. Deploy and interaction stay attached to their current workspace.",
        "idle"
      );
      return;
    }
    if (!PgExplorer.allWorkspaceNames?.includes(workspaceName)) {
      setCustomPrograms((current) =>
        current.filter((candidate) => candidate.workspaceName !== workspaceName)
      );
      addEvent(
        "idea",
        `${workspaceName} is no longer available`,
        "Its saved files were removed from this browser, so the program was removed from your list.",
        "error"
      );
      return;
    }

    setReady(false);
    try {
      await PgExplorer.switchWorkspace(workspaceName, {
        defaultOpenFile: "src/lib.rs",
      });
      localStorage.setItem(CUSTOM_WORKSPACE_KEY, workspaceName);
      setCustomProgram(workspaceName);
      setLibraryTab("examples");
      activeWorkspaceNameRef.current = workspaceName;
      setActiveWorkspaceName(workspaceName);
      if (!workspaceStatesRef.current[workspaceName]) {
        updateWorkspaceState(workspaceName, () =>
          createWorkspaceLearningState(workspaceName)
        );
      }
      setInteractionOpen(false);
      setWalletOpen(false);
      setMobilePanel("code");
    } finally {
      setReady(true);
    }
  };

  const startNewProgram = async () => {
    if (chainActionRef.current && chainActionRef.current.action !== "build") {
      addEvent(
        chainActionRef.current.action === "deploy" ? "deploy" : "instruction",
        "Finish the current action first",
        "You can open another program while a build runs. Deploy and interaction stay attached to their current workspace.",
        "idle"
      );
      return;
    }
    setReady(false);
    const existing = new Set(PgExplorer.allWorkspaceNames ?? []);
    let index = 1;
    while (existing.has(`learn-my-program-${index}`)) index += 1;
    const workspaceName = `learn-my-program-${index}`;
    await PgExplorer.createWorkspace(workspaceName, {
      files: NEW_PROGRAM_FILES,
      defaultOpenFile: "src/lib.rs",
    });
    setCustomPrograms((current) => [
      ...current.filter((program) => program.workspaceName !== workspaceName),
      { workspaceName, createdAt: Date.now() },
    ]);
    localStorage.setItem(CUSTOM_WORKSPACE_KEY, workspaceName);
    setCustomProgram(workspaceName);
    setLibraryTab("examples");
    activeWorkspaceNameRef.current = workspaceName;
    setActiveWorkspaceName(workspaceName);
    updateWorkspaceState(workspaceName, () =>
      createWorkspaceLearningState(workspaceName)
    );
    setInteractionOpen(false);
    setChatInput("I want to build ");
    setReady(true);
    setMobilePanel("tutor");
    addEvent(
      "idea",
      "New guided program created",
      "A tiny working starter is open. Describe your idea to Program Pal to shape it.",
      "success",
      undefined,
      undefined,
      workspaceName
    );
  };

  const connectRpc = useCallback(
    async (endpoint: string) => {
      if (surfpoolConnected && connectedRpcRef.current === endpoint) return;
      if (surfpoolConnectPromiseRef.current) {
        return surfpoolConnectPromiseRef.current;
      }

      const connect = (async () => {
        setNetworkBusy(true);
        const isDeployedSurfpool = endpoint === SURFPOOL_RPC_URL;
        addEvent(
          "network",
          isDeployedSurfpool ? "Connecting to Surfpool" : "Connecting to RPC",
          `Opening ${formatRpcLabel(endpoint)}.`,
          "working"
        );
        try {
          PgSettings.server.endpoint = LEARNING_BUILD_SERVER_URL;
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "getHealth",
            }),
          });
          const health = await response.json();
          if (!response.ok || health.result !== "ok") {
            throw new Error(
              "This RPC did not return a healthy Solana response."
            );
          }

          PgSettings.connection.endpoint = endpoint;
          const surfpoolWallet = ensureSurfpoolWallet();

          localStorage.removeItem(SURFPOOL_KEY);
          connectedRpcRef.current = endpoint;
          setSurfpoolConnected(true);
          addEvent(
            "network",
            isDeployedSurfpool
              ? "Connected to deployed Surfpool"
              : "Connected to custom RPC",
            `Using ${formatRpcLabel(endpoint)} with play wallet ${shortAddress(
              surfpoolWallet.publicKey.toBase58()
            )}.`,
            "success"
          );
        } catch (error: any) {
          connectedRpcRef.current = null;
          setSurfpoolConnected(false);
          addEvent("network", "RPC needs attention", error.message, "error");
          throw error;
        } finally {
          setNetworkBusy(false);
        }
      })();

      surfpoolConnectPromiseRef.current = connect;
      try {
        await connect;
      } finally {
        surfpoolConnectPromiseRef.current = null;
      }
    },
    [addEvent, surfpoolConnected]
  );

  const ensureSurfpool = useCallback(
    () => connectRpc(rpcEndpoint),
    [connectRpc, rpcEndpoint]
  );

  const saveRpcEndpoint = async (event: FormEvent) => {
    event.preventDefault();
    setRpcError("");
    try {
      const next = normalizeRpcUrl(rpcDraft);
      if (next === SURFPOOL_RPC_URL) {
        localStorage.removeItem(CUSTOM_RPC_KEY);
      } else {
        localStorage.setItem(CUSTOM_RPC_KEY, next);
      }
      connectedRpcRef.current = null;
      setSurfpoolConnected(false);
      setRpcEndpoint(next);
      setRpcDraft(next);
      await connectRpc(next);
      setRpcSettingsOpen(false);
    } catch (error: any) {
      setRpcError(error?.message ?? "Could not connect to this RPC.");
    }
  };

  const useDeployedSurfpool = () => {
    setRpcDraft(SURFPOOL_RPC_URL);
    setRpcError("");
  };

  useEffect(() => {
    if (!ready || surfpoolConnected) return;
    ensureSurfpool().catch(() => {
      // The inline connection note already exposes the actionable error.
    });
  }, [ensureSurfpool, ready, surfpoolConnected]);

  const buildProgram = useCallback(
    async (workspaceName: string) => {
      if (PgExplorer.currentWorkspaceName !== workspaceName) {
        throw new Error("Open this workspace before starting its build.");
      }
      activeBuildLogRef.current = { workspaceName, lines: [] };
      setWorkspaceField(workspaceName, "programStage", "source");
      addEvent(
        "build",
        "Building the program",
        "Rust is compiling to Solana bytecode and Anchor is generating an IDL.",
        "working",
        undefined,
        undefined,
        workspaceName
      );
      try {
        // Call the build handler directly so it snapshots this workspace before
        // navigation can switch PgExplorer to another lesson.
        const result = await buildCurrentProgram();
        if (result.failed) {
          throw new Error(
            "The compiler found an issue. Ask the tutor to explain the highlighted error."
          );
        }
        if (result.idl) {
          const idlJson = JSON.stringify(result.idl, null, 2);
          if (PgExplorer.currentWorkspaceName === workspaceName) {
            await PgExplorer.createItem("idl.json", idlJson, {
              override: true,
            });
          } else {
            await PgExplorer.fs.writeFile(
              `/${workspaceName}/idl.json`,
              idlJson,
              { createParents: true }
            );
          }
        }
        setWorkspaceField(workspaceName, "programStage", "built");
        const builtLesson = LEARNING_EXAMPLES.find(
          (example) => example.workspaceName === workspaceName
        );
        if (builtLesson) markLessonProgress(builtLesson.id, "built");
        addEvent(
          "build",
          "Build complete",
          PgExplorer.currentWorkspaceName === workspaceName
            ? "The program binary is ready, and its generated IDL is open in a new tab."
            : "The program binary and generated IDL are ready. Open this workspace to inspect them.",
          "success",
          undefined,
          undefined,
          workspaceName
        );
        activeBuildLogRef.current = null;
        return "Build completed and an IDL was generated.";
      } catch (error: any) {
        setWorkspaceField(workspaceName, "programStage", "source");
        const buildOutput =
          activeBuildLogRef.current?.workspaceName === workspaceName
            ? activeBuildLogRef.current.lines.join("\n").trim()
            : "";
        const errorMessage = error?.message || "Build failed.";
        const diagnostic =
          buildOutput && !buildOutput.includes(errorMessage)
            ? `${buildOutput}\n\n${errorMessage}`
            : buildOutput || errorMessage;
        activeBuildLogRef.current = null;
        addEvent(
          "build",
          "Build failed",
          "The compiler found an issue. Copy the error or ask Program Pal to walk through it.",
          "error",
          diagnostic,
          undefined,
          workspaceName
        );
        throw error;
      }
    },
    [addEvent, setWorkspaceField]
  );

  const deployProgram = useCallback(async () => {
    if (!surfpoolConnected) await ensureSurfpool();
    if (!PgProgramInfo.uuid || PgProgramInfo.lastBuildFailed) {
      await buildProgram(activeWorkspaceNameRef.current);
    }
    addEvent(
      "deploy",
      "Deploying to Surfpool",
      "The browser is writing the program binary into an executable account.",
      "working"
    );
    try {
      await PgCommand.deploy.execute();
      setProgramStage("deployed");
      if (!customProgram) markLessonProgress(lessonId, "deployed");
      addEvent(
        "deploy",
        "Program is onchain",
        `Program ${shortAddress(
          PgProgramInfo.pk?.toBase58() ?? ""
        )} is executable on your private Surfpool.`,
        "success",
        undefined,
        PgProgramInfo.pk
          ? getExplorerAddressUrl(PgProgramInfo.pk.toBase58())
          : undefined
      );
      return "Program deployed successfully to the isolated local network.";
    } catch (error: any) {
      addEvent("deploy", "Deployment failed", error.message, "error");
      throw error;
    }
  }, [
    addEvent,
    buildProgram,
    customProgram,
    ensureSurfpool,
    lessonId,
    setProgramStage,
    surfpoolConnected,
  ]);

  const openInteraction = useCallback(
    (instruction?: string) => {
      const idl = PgProgramInfo.idl;
      if (!idl) {
        addEvent(
          "instruction",
          "Build first",
          "The interaction panel is generated from the IDL created during a successful build.",
          "error"
        );
        return "The program needs a successful build before its instructions can be opened.";
      }
      setInteractionIdl(idl);
      setInteractionOpen(true);
      setInteractionReceipt(null);
      return instruction
        ? `Opened the ${instruction} controls in this page.`
        : `Opened ${idl.instructions.length} callable instruction${
            idl.instructions.length === 1 ? "" : "s"
          } in this page.`;
    },
    [addEvent]
  );

  const recordInstructionSuccess = useCallback(
    (signature: string, instructionName: string) => {
      setInteractionReceipt({ signature, instructionName });
      addEvent(
        "instruction",
        `${humanizeInstructionName(instructionName)} confirmed`,
        "Surfpool accepted the transaction. Open it in Explorer to inspect the instruction and logs.",
        "success",
        undefined,
        getExplorerTransactionUrl(signature)
      );
      setTimelineView("notes");
    },
    [addEvent]
  );

  const setInlineInteractionRunning = useCallback(
    (workspaceName: string, running: boolean) => {
      if (running) {
        const activeAction = {
          action: "interact" as const,
          workspaceName,
        };
        chainActionRef.current = activeAction;
        terminalOwnerRef.current = workspaceName;
        setBackgroundAction(activeAction);
        setWorkspaceField(workspaceName, "chainAction", "interact");
        return;
      }

      if (
        chainActionRef.current?.action === "interact" &&
        chainActionRef.current.workspaceName === workspaceName
      ) {
        chainActionRef.current = null;
        terminalOwnerRef.current = null;
        setBackgroundAction(null);
        setWorkspaceField(workspaceName, "chainAction", null);
      }
    },
    [setWorkspaceField]
  );

  const runLessonInteraction = useCallback(
    async (instruction?: string) => {
      const workspaceName = activeWorkspaceNameRef.current;
      if (
        workspaceStatesRef.current[workspaceName]?.programStage !== "deployed"
      ) {
        await deployProgram();
      }
      addEvent(
        "instruction",
        `Running ${instruction ?? "the lesson interaction"}`,
        "The browser test is submitting a real transaction to your private Surfpool.",
        "working"
      );
      const connection = PgConnection.current;
      const signatures: string[] = [];
      const originalSendRawTransaction = connection.sendRawTransaction;
      const sendRawTransaction = originalSendRawTransaction.bind(connection);
      connection.sendRawTransaction = async (...args) => {
        const signature = await sendRawTransaction(...args);
        signatures.push(signature);
        return signature;
      };
      try {
        await PgCommand.test.execute();
        const signature = signatures.at(-1);
        if (signature) {
          setInteractionReceipt({
            signature,
            instructionName: instruction ?? "tutorial test",
          });
        }
        addEvent(
          "instruction",
          "Interaction confirmed",
          "The lesson test sent its transaction and checked the resulting onchain state.",
          "success",
          undefined,
          signature ? getExplorerTransactionUrl(signature) : undefined
        );
        return "The lesson interaction ran successfully on the isolated Surfpool.";
      } catch (error: any) {
        addEvent("instruction", "Interaction failed", error.message, "error");
        throw error;
      } finally {
        connection.sendRawTransaction = originalSendRawTransaction;
      }
    },
    [addEvent, deployProgram]
  );

  const runChainAction = useCallback(
    async (action: ChainAction, operation: () => Promise<string> | string) => {
      if (chainActionRef.current) {
        return `${
          chainActionRef.current.action[0].toUpperCase() +
          chainActionRef.current.action.slice(1)
        } is already in progress for another workspace.`;
      }

      const workspaceName = activeWorkspaceNameRef.current;
      const activeAction = { action, workspaceName };
      chainActionRef.current = activeAction;
      terminalOwnerRef.current = workspaceName;
      setBackgroundAction(activeAction);
      setWorkspaceField(workspaceName, "chainAction", action);
      const startedAt = Date.now();

      try {
        return await operation();
      } finally {
        const remainingClickGuard = Math.max(0, 350 - (Date.now() - startedAt));
        if (remainingClickGuard) {
          await new Promise((resolve) =>
            window.setTimeout(resolve, remainingClickGuard)
          );
        }
        if (chainActionRef.current === activeAction) {
          chainActionRef.current = null;
          terminalOwnerRef.current = null;
          setBackgroundAction(null);
          setWorkspaceField(workspaceName, "chainAction", null);
        }
      }
    },
    [setWorkspaceField]
  );

  const runBuild = useCallback(() => {
    const workspaceName = activeWorkspaceNameRef.current;
    return runChainAction("build", () => buildProgram(workspaceName));
  }, [buildProgram, runChainAction]);

  const runDeploy = useCallback(
    () => runChainAction("deploy", deployProgram),
    [deployProgram, runChainAction]
  );

  const runOpenInteraction = useCallback(
    () => runChainAction("interact", openInteraction),
    [openInteraction, runChainAction]
  );

  const runInteraction = useCallback(
    (instruction?: string) =>
      runChainAction("interact", () => runLessonInteraction(instruction)),
    [runChainAction, runLessonInteraction]
  );

  const executeTool = useCallback(
    async (tool: TutorToolCall, workspaceName: string) => {
      switch (tool.name) {
        case "propose_workspace_patch": {
          const proposedPatch = validateWorkspacePatch(tool.arguments);
          setWorkspaceField(workspaceName, "patch", proposedPatch);
          addEvent(
            "idea",
            proposedPatch.title,
            "Review the files and explanation before applying it.",
            "idle",
            undefined,
            undefined,
            workspaceName
          );
          return "The proposed workspace patch is visible for learner review. It has not been applied.";
        }
        case "build_program": {
          if (activeWorkspaceNameRef.current !== workspaceName) {
            throw new Error(
              "The learner switched workspaces. Ask them to return before starting this build."
            );
          }
          return await runBuild();
        }
        case "deploy_program": {
          if (activeWorkspaceNameRef.current !== workspaceName) {
            throw new Error(
              "The learner switched workspaces. Ask them to return before deploying this program."
            );
          }
          return await runDeploy();
        }
        case "run_instruction": {
          if (activeWorkspaceNameRef.current !== workspaceName) {
            throw new Error(
              "The learner switched workspaces. Ask them to return before running this instruction."
            );
          }
          return await runInteraction(tool.arguments.instruction);
        }
      }
    },
    [addEvent, runBuild, runDeploy, runInteraction, setWorkspaceField]
  );

  const askTutor = useCallback(
    async (message: string) => {
      const clean = message.trim();
      if (!clean || chatting) return;
      const workspaceName = activeWorkspaceNameRef.current;
      const workspaceState =
        workspaceStatesRef.current[workspaceName] ??
        createWorkspaceLearningState(workspaceName);
      const workspaceLesson = LEARNING_EXAMPLES.find(
        (example) => example.workspaceName === workspaceName
      );
      const updateMessages = (value: SetStateAction<TutorMessage[]>) =>
        setWorkspaceField(workspaceName, "messages", value);
      const learnerMessage: TutorMessage = {
        id: randomId(),
        role: "learner",
        text: clean,
      };
      const tutorId = randomId();
      updateMessages((current) => [
        ...current,
        learnerMessage,
        { id: tutorId, role: "tutor", text: "", streaming: true },
      ]);
      setChatInput("");
      setChatting(true);
      setMobilePanel("tutor");
      try {
        let responseId = workspaceState.previousResponseId;
        const workspaceTutorial = PgTutorial.all.find(
          (tutorial) => tutorial.name === workspaceName
        );
        let nextMessage = clean;
        if (workspaceTutorial) {
          const tutorialContent = await getTutorialWorkspaceContent(
            workspaceTutorial
          );
          const teaching = createTutorialTeaching(
            workspaceTutorial,
            tutorialContent
          );
          const currentTeaching =
            workspaceState.programStage === "deployed"
              ? teaching.deployed
              : workspaceState.programStage === "built"
              ? teaching.built
              : teaching.source;
          nextMessage = [
            `You are teaching the imported tutorial “${workspaceTutorial.name}”.`,
            `The learner is at the ${workspaceState.programStage} stage.`,
            "Use this authored tutorial context when answering, but do not repeat it unless it helps:",
            currentTeaching.slice(0, 16000),
            "Learner question:",
            clean,
          ].join("\n\n");
        }
        let toolOutputs: Array<{ callId: string; output: unknown }> | undefined;

        for (let turn = 0; turn < 4; turn += 1) {
          const toolCalls: TutorToolCall[] = [];
          const createdResponseId = await streamTutor({
            message: nextMessage,
            lessonId: workspaceLesson?.id ?? "custom-program",
            previousResponseId: responseId,
            toolOutputs,
            onResponseId: (id) =>
              setWorkspaceField(workspaceName, "previousResponseId", id),
            onText: (delta) =>
              updateMessages((current) =>
                current.map((item) =>
                  item.id === tutorId
                    ? { ...item, text: item.text + delta }
                    : item
                )
              ),
            onToolCall: (tool) => toolCalls.push(tool),
          });
          responseId = createdResponseId ?? responseId;
          if (!toolCalls.length) break;

          toolOutputs = [];
          for (const tool of toolCalls) {
            try {
              toolOutputs.push({
                callId: tool.callId,
                output: await executeTool(tool, workspaceName),
              });
            } catch (error: any) {
              const message = error.message ?? "The action failed.";
              addEvent(
                "idea",
                "Action failed",
                message,
                "error",
                undefined,
                undefined,
                workspaceName
              );
              toolOutputs.push({
                callId: tool.callId,
                output: { error: message },
              });
            }
          }
          nextMessage = "";
        }
      } catch (error: any) {
        updateMessages((current) =>
          current.map((item) =>
            item.id === tutorId
              ? {
                  ...item,
                  text:
                    error.message ||
                    "The tutor could not respond. Your code and Surfpool are still safe.",
                }
              : item
          )
        );
      } finally {
        updateMessages((current) =>
          current.map((item) =>
            item.id === tutorId ? { ...item, streaming: false } : item
          )
        );
        setChatting(false);
      }
    },
    [addEvent, chatting, executeTool, setWorkspaceField]
  );

  const applyPatch = async () => {
    if (!patch) return;
    const undoMessageId = randomId();
    const previous = patch.files.map(({ path }) => ({
      path,
      content: PgExplorer.getFileContent(path),
    }));
    for (const file of patch.files) {
      await PgExplorer.createItem(file.path, file.content, {
        override: true,
      });
    }
    setUndoFiles(previous);
    setPatch(null);
    setProgramStage("source");
    setMessages((current) => [
      ...current.map((message) =>
        message.action === "undo-workspace-change"
          ? { ...message, actionAvailable: false }
          : message
      ),
      {
        id: undoMessageId,
        role: "system",
        text: "Change applied to your workspace.",
        action: "undo-workspace-change",
        actionAvailable: true,
      },
    ]);
    addEvent(
      "idea",
      "Tutor change applied",
      "The workspace was updated. The Undo action stays beside the change in your conversation.",
      "success"
    );
  };

  const undoPatch = async (messageId: string) => {
    if (!undoFiles) return;
    for (const file of undoFiles) {
      if (file.content === undefined) {
        await PgExplorer.deleteItem(file.path);
      } else {
        await PgExplorer.createItem(file.path, file.content, {
          override: true,
        });
      }
    }
    setUndoFiles(null);
    setProgramStage("source");
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              text: "Change undone.",
              actionAvailable: false,
            }
          : message
      )
    );
    addEvent(
      "idea",
      "Tutor change undone",
      "Your previous workspace files are restored.",
      "success"
    );
  };

  const resetNetwork = async () => {
    if (!surfpoolConnected) return;
    setNetworkBusy(true);
    try {
      const response = await fetch(rpcEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "surfnet_resetNetwork",
          params: [],
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(
          result.error?.message ?? "The deployed Surfpool could not be reset."
        );
      }
      setProgramStage((stage) => (stage === "deployed" ? "built" : stage));
      addEvent(
        "network",
        "Surfpool reset",
        "All accounts returned to the network's initial state. Your source files were not changed.",
        "success"
      );
    } catch (error: any) {
      addEvent("network", "Reset failed", error.message, "error");
    } finally {
      setNetworkBusy(false);
    }
  };

  const submitChat = (event: FormEvent) => {
    event.preventDefault();
    askTutor(chatInput);
  };

  const startTutorResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = tutorWidth;
      const previousCursor = document.body.style.cursor;
      const previousSelection = document.body.style.userSelect;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const move = (pointerEvent: PointerEvent) => {
        setTutorWidth(
          clampTutorWidth(startWidth + startX - pointerEvent.clientX)
        );
      };
      const stop = () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousSelection;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
    },
    [tutorWidth]
  );

  const resizeTutorWithKeyboard = (
    event: ReactKeyboardEvent<HTMLButtonElement>
  ) => {
    const step = event.shiftKey ? 64 : 16;
    let nextWidth: number | undefined;
    if (event.key === "ArrowLeft") nextWidth = tutorWidth + step;
    if (event.key === "ArrowRight") nextWidth = tutorWidth - step;
    if (event.key === "Home") nextWidth = MIN_TUTOR_WIDTH;
    if (event.key === "End") nextWidth = getMaxTutorWidth();
    if (nextWidth === undefined) return;
    event.preventDefault();
    setTutorWidth(clampTutorWidth(nextWidth));
  };

  const startTimelineResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const startY = event.clientY;
      const startHeight = timelineHeight;
      const previousCursor = document.body.style.cursor;
      const previousSelection = document.body.style.userSelect;

      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";

      const move = (pointerEvent: PointerEvent) => {
        setTimelineHeight(
          clampTimelineHeight(startHeight + startY - pointerEvent.clientY)
        );
      };
      const stop = () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousSelection;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
    },
    [timelineHeight]
  );

  const resizeTimelineWithKeyboard = (
    event: ReactKeyboardEvent<HTMLButtonElement>
  ) => {
    const step = event.shiftKey ? 64 : 16;
    let nextHeight: number | undefined;
    if (event.key === "ArrowUp") nextHeight = timelineHeight + step;
    if (event.key === "ArrowDown") nextHeight = timelineHeight - step;
    if (event.key === "Home") nextHeight = MIN_TIMELINE_HEIGHT;
    if (event.key === "End") nextHeight = getMaxTimelineHeight();
    if (nextHeight === undefined) return;
    event.preventDefault();
    setTimelineHeight(clampTimelineHeight(nextHeight));
  };

  const copyDiagnostic = async (event: LearningEvent) => {
    if (!event.diagnostic) return;
    try {
      await navigator.clipboard.writeText(event.diagnostic);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = event.diagnostic;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
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
    const address = wallet.publicKey.toBase58();
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = address;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
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
      <Header>
        <Brand>
          <BrandMark>
            <span />
            <span />
            <span />
          </BrandMark>
          <BrandCopy>
            <strong>Solana Playground</strong>
          </BrandCopy>
        </Brand>

        <HeaderActions>
          <NetworkControl>
            {activeRpcUrl ? (
              <ConnectedStatus>
                <span>Connected to</span>
                <a
                  href={activeExplorerUrl ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  title="Open the connected RPC in Solana Explorer"
                >
                  {formatRpcLabel(activeRpcUrl)} ↗
                </a>
              </ConnectedStatus>
            ) : (
              <PrimaryButton onClick={ensureSurfpool} disabled={networkBusy}>
                {networkBusy ? "Connecting…" : "Connect RPC"}
              </PrimaryButton>
            )}
            <RpcSettingsButton
              type="button"
              onClick={() => {
                setRpcDraft(rpcEndpoint);
                setRpcError("");
                setRpcSettingsOpen((current) => !current);
              }}
              aria-expanded={rpcSettingsOpen}
              title="Choose a Solana RPC endpoint"
            >
              RPC
            </RpcSettingsButton>
            {rpcSettingsOpen && (
              <RpcPopover onSubmit={saveRpcEndpoint}>
                <div>
                  <Kicker>Network</Kicker>
                  <button
                    type="button"
                    onClick={() => setRpcSettingsOpen(false)}
                    aria-label="Close RPC settings"
                  >
                    ×
                  </button>
                </div>
                <strong>Use your own RPC</strong>
                <p>
                  Enter an HTTP or HTTPS Solana endpoint. It stays in this
                  browser.
                </p>
                <label>
                  <span>RPC URL</span>
                  <input
                    type="url"
                    value={rpcDraft}
                    onChange={(event) => setRpcDraft(event.target.value)}
                    placeholder="https://your-rpc.example"
                    spellCheck={false}
                    required
                  />
                </label>
                {rpcError && <small role="alert">{rpcError}</small>}
                <footer>
                  <button type="button" onClick={useDeployedSurfpool}>
                    Use Surfpool
                  </button>
                  <button type="submit" disabled={networkBusy}>
                    {networkBusy ? "Connecting…" : "Save & connect"}
                  </button>
                </footer>
              </RpcPopover>
            )}
          </NetworkControl>
          <ThemeToggle
            type="button"
            onClick={() =>
              setThemeMode((current) => (current === "dark" ? "light" : "dark"))
            }
            aria-label={`Switch to ${
              themeMode === "dark" ? "light" : "dark"
            } mode`}
            title={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}
          >
            <span aria-hidden="true">{themeMode === "dark" ? "☀" : "☾"}</span>
          </ThemeToggle>
        </HeaderActions>
      </Header>

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
        <LessonRail visible={mobilePanel === "learn"}>
          <LearningKindTabs role="tablist" aria-label="Learning workspaces">
            <button
              type="button"
              role="tab"
              aria-selected={libraryTab === "examples"}
              className={libraryTab === "examples" ? "active" : undefined}
              onClick={() => setLibraryTab("examples")}
            >
              Programs
              <span>
                {customPrograms.length +
                  importedExampleIds.length +
                  importedProgramRepos.length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={libraryTab === "tutorials"}
              className={libraryTab === "tutorials" ? "active" : undefined}
              onClick={() => setLibraryTab("tutorials")}
            >
              Tutorials
              <span>{importedTutorialNames.length}</span>
            </button>
          </LearningKindTabs>

          <ChapterList>
            {libraryTab === "examples" ? (
              <>
                {[...customPrograms]
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((program) => (
                    <ChapterButton
                      key={program.workspaceName}
                      active={customProgram === program.workspaceName}
                      onClick={() => void selectCustomProgram(program)}
                    >
                      <CustomProgramNumber>✦</CustomProgramNumber>
                      <CustomProgramCopy>
                        <small>MY CUSTOM PROGRAM</small>
                        <strong>{program.workspaceName}</strong>
                      </CustomProgramCopy>
                    </ChapterButton>
                  ))}
                {LEARNING_EXAMPLES.filter((example) =>
                  importedExampleIds.includes(example.id)
                ).map((example) => {
                  const state = progress[example.id];
                  return (
                    <ChapterButton
                      key={example.id}
                      active={!customProgram && example.id === lessonId}
                      onClick={() => void selectLesson(example)}
                    >
                      <ChapterNumber>
                        {state === "deployed" ? "✓" : `0${example.order}`}
                      </ChapterNumber>
                      <span>
                        <small>{example.eyebrow}</small>
                        <strong>{example.title}</strong>
                      </span>
                    </ChapterButton>
                  );
                })}
                {programs
                  .filter((program) =>
                    importedProgramRepos.includes(program.repo)
                  )
                  .map((program) => {
                    const workspaceName = getProgramWorkspaceName(program);
                    return (
                      <ChapterButton
                        key={program.repo}
                        active={customProgram === workspaceName}
                        onClick={() => void selectProgram(program)}
                      >
                        <ChapterNumber>✦</ChapterNumber>
                        <span>
                          <small>{program.framework} · PROGRAM</small>
                          <strong>{program.name}</strong>
                        </span>
                      </ChapterButton>
                    );
                  })}
              </>
            ) : importedTutorialNames.length ? (
              PgTutorial.all
                .filter((tutorial) =>
                  importedTutorialNames.includes(tutorial.name)
                )
                .map((tutorial, index) => (
                  <ChapterButton
                    key={tutorial.name}
                    active={customProgram === tutorial.name}
                    onClick={() => void selectTutorial(tutorial)}
                  >
                    <ChapterNumber>
                      {String(index + 1).padStart(2, "0")}
                    </ChapterNumber>
                    <span>
                      <small>
                        {tutorial.level}
                        {tutorial.framework ? ` · ${tutorial.framework}` : ""}
                      </small>
                      <strong>{tutorial.name}</strong>
                    </span>
                  </ChapterButton>
                ))
            ) : (
              <SidebarEmpty>
                <span>✦</span>
                <strong>No tutorials imported</strong>
                <p>Choose one from the library when you are ready.</p>
              </SidebarEmpty>
            )}
          </ChapterList>

          <ImportShelf>
            <button type="button" onClick={() => setImportLibraryOpen(true)}>
              <span>＋</span>
              <strong>New</strong>
              <b>→</b>
            </button>
          </ImportShelf>
        </LessonRail>

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
                  ? activeCustomEntry.workspaceName
                  : customProgram
                  ? "Your guided program"
                  : lesson.title}
              </h2>
            </LessonHeading>
            <ActionStrip>
              <ActionButton
                onClick={() => void runBuild()}
                disabled={actionBusy}
                $active={!actionBusy}
                title={
                  actionBusyTitle
                    ? actionBusyTitle
                    : "Compile the program — Surfpool is not required"
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
                  actionBusyTitle
                    ? actionBusyTitle
                    : canDeploy
                    ? surfpoolConnected
                      ? "Deploy to Surfpool"
                      : "Connects to Surfpool, then deploys"
                    : "Build first"
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
                  <span>↗</span>{" "}
                  {chainAction === "deploy" ? "Deploying…" : "Deploy"}
                </ActionButton>
              </ActionHint>
              <ActionHint
                title={
                  actionBusyTitle
                    ? actionBusyTitle
                    : canInteract
                    ? undefined
                    : "Deploy first"
                }
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
            <Experiment>
              <ExperimentIcon>✦</ExperimentIcon>
              <div>
                <Kicker>Next hands-on experiment</Kicker>
                <strong>
                  {customProgram
                    ? "Turn your idea into the first instruction"
                    : lesson.experiment.title}
                </strong>
                <p>
                  {customProgram
                    ? "Describe the smallest useful action. The tutor will propose the code and explain the accounts it needs."
                    : lesson.experiment.description}
                </p>
              </div>
              <DoItButton
                className="experiment-action"
                onClick={() => {
                  setExperimentDismissed(true);
                  void askTutor(
                    customProgram
                      ? "Help me choose and implement the smallest useful first instruction for my new program."
                      : lesson.experiment.prompt
                  );
                }}
              >
                Do it <span>→</span>
              </DoItButton>
              <ExperimentDismissButton
                className="experiment-dismiss"
                type="button"
                onClick={() => setExperimentDismissed(true)}
                aria-label="Dismiss this experiment"
                title="Dismiss this experiment"
              >
                ×
              </ExperimentDismissButton>
            </Experiment>
          )}

          <Timeline>
            <TimelineResizeHandle
              type="button"
              role="separator"
              aria-label="Resize Notes and Verbose output"
              aria-controls="activity-output"
              aria-orientation="horizontal"
              aria-valuemin={MIN_TIMELINE_HEIGHT}
              aria-valuemax={getMaxTimelineHeight()}
              aria-valuenow={Math.round(timelineHeight)}
              title="Drag to resize Notes and Verbose"
              onPointerDown={startTimelineResize}
              onKeyDown={resizeTimelineWithKeyboard}
            />
            <TimelineHeader>
              <TimelineTabs role="tablist" aria-label="Activity output">
                <TimelineTab
                  type="button"
                  role="tab"
                  aria-selected={timelineView === "notes"}
                  active={timelineView === "notes"}
                  onClick={() => setTimelineView("notes")}
                >
                  Notes
                </TimelineTab>
                <TimelineTab
                  type="button"
                  role="tab"
                  aria-selected={timelineView === "verbose"}
                  active={timelineView === "verbose"}
                  onClick={() => setTimelineView("verbose")}
                >
                  Verbose
                </TimelineTab>
              </TimelineTabs>
              <button
                onClick={resetNetwork}
                disabled={!surfpoolConnected || networkBusy}
              >
                Reset network
              </button>
            </TimelineHeader>
            {timelineView === "notes" ? (
              <EventList id="activity-output">
                {events.slice(0, 4).map((event) => (
                  <EventRow key={event.id} status={event.status}>
                    {event.status === "working" ? (
                      <WorkingSpinner aria-label="In progress" />
                    ) : (
                      <EventGlyph
                        status={event.status}
                        aria-label={`${event.status} note`}
                      >
                        {eventGlyph(event.kind)}
                      </EventGlyph>
                    )}
                    <EventCopy>
                      <strong>{event.title}</strong>
                      <span>{event.detail}</span>
                      <NoteActions>
                        {event.status === "error" &&
                          event.kind === "build" &&
                          event.diagnostic && (
                            <button
                              type="button"
                              onClick={() => copyDiagnostic(event)}
                            >
                              {copiedEventId === event.id
                                ? "Copied"
                                : "Copy error"}
                            </button>
                          )}
                        <button
                          type="button"
                          onClick={() => explainEvent(event)}
                          disabled={chatting}
                          title={
                            chatting
                              ? "Program Pal is finishing another explanation"
                              : `Ask Program Pal to explain “${event.title}”`
                          }
                        >
                          Explain
                        </button>
                      </NoteActions>
                      {event.explorerUrl && (
                        <EventExplorerLink
                          href={event.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View in Explorer ↗
                        </EventExplorerLink>
                      )}
                    </EventCopy>
                    <time>
                      {new Date(event.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </EventRow>
                ))}
              </EventList>
            ) : (
              <VerboseLog id="activity-output" aria-live="polite">
                {terminalLines.length
                  ? terminalLines.join("\n")
                  : "Terminal output will appear here when you build, deploy, or interact."}
              </VerboseLog>
            )}
          </Timeline>

          {walletOpen && wallet && (
            <LearningWalletPanel aria-label="Wallet">
              <LearningWalletHeader>
                <h3>Wallet</h3>
                <button
                  type="button"
                  onClick={() => setWalletOpen(false)}
                  aria-label="Close wallet"
                  title="Close wallet"
                >
                  ×
                </button>
              </LearningWalletHeader>

              <LearningWalletBalance>
                <span>Available balance</span>
                <strong>
                  {walletBalance === null || walletBalance === undefined
                    ? "—"
                    : walletBalance === 0
                    ? "0"
                    : walletBalance.toFixed(3)}{" "}
                  SOL
                </strong>
                <small>Balance on the connected RPC network</small>
              </LearningWalletBalance>

              <LearningWalletAddress>
                <span>Public address</span>
                <code>{wallet.publicKey.toBase58()}</code>
                <div>
                  <button type="button" onClick={copyWalletAddress}>
                    {walletAddressCopied ? "Copied" : "Copy address"}
                  </button>
                  <a
                    href={`https://explorer.solana.com/address/${wallet.publicKey.toBase58()}?cluster=custom&customUrl=${encodeURIComponent(
                      activeRpcUrl ?? rpcEndpoint
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Explorer ↗
                  </a>
                </div>
              </LearningWalletAddress>

              <LearningWalletNote>
                This disposable play wallet is stored only in this browser and
                signs transactions for the connected RPC. It is not your real
                Solana wallet.
              </LearningWalletNote>
            </LearningWalletPanel>
          )}

          {interactionOpen && interactionIdl && (
            <InlineInteractionDrawer
              aria-label="Program interaction panel"
              aria-live="polite"
            >
              <InteractionDrawerHeader>
                <div>
                  <Kicker>Onchain controls</Kicker>
                  <h3>Try {interactionIdl.name}</h3>
                  <p>
                    These controls come directly from the generated IDL. Open an
                    instruction to see its arguments and accounts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInteractionOpen(false)}
                  aria-label="Close interaction panel"
                  title="Close interaction panel"
                >
                  ×
                </button>
              </InteractionDrawerHeader>

              <InteractionMeta>
                <strong>
                  {interactionIdl.instructions.length} callable instruction
                  {interactionIdl.instructions.length === 1 ? "" : "s"}
                </strong>
                <span>Connected to {formatRpcLabel(rpcEndpoint)}</span>
              </InteractionMeta>

              <InteractionTestBar>
                <div>
                  <Kicker>Tutorial client</Kicker>
                  <strong>Run the workspace tests</strong>
                  <span>
                    Execute the current test files against this deployed program
                    and follow every transaction in Notes.
                  </span>
                </div>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void runInteraction()}
                >
                  {chainAction === "interact" ? "Testing…" : "Run tests"}
                </button>
              </InteractionTestBar>

              {interactionReceipt && (
                <InteractionReceipt>
                  <span>Transaction confirmed</span>
                  <strong>
                    {humanizeInstructionName(
                      interactionReceipt.instructionName
                    )}
                  </strong>
                  <a
                    href={getExplorerTransactionUrl(
                      interactionReceipt.signature
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View in Explorer ↗
                  </a>
                </InteractionReceipt>
              )}

              <InlineInstructionList>
                <IdlProvider idl={interactionIdl}>
                  {interactionIdl.instructions.map((idlInstruction, index) => (
                    <Instruction
                      key={JSON.stringify(idlInstruction)}
                      index={index}
                      idlInstruction={idlInstruction}
                      buttonLabel="Run instruction"
                      walletAvailable={surfpoolConnected}
                      inline
                      onRunningChange={(running) =>
                        setInlineInteractionRunning(
                          activeWorkspaceName,
                          running
                        )
                      }
                      onSuccess={recordInstructionSuccess}
                      onError={(error, instructionName) => {
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
                    />
                  ))}
                </IdlProvider>
              </InlineInstructionList>

              <InteractionDrawerFooter>
                Every successful run creates a real Surfpool transaction and an
                Explorer link.
              </InteractionDrawerFooter>
            </InlineInteractionDrawer>
          )}
        </Workbench>

        <TutorPanel id="program-pal-panel" visible={mobilePanel === "tutor"}>
          <TutorResizeHandle
            type="button"
            role="separator"
            aria-label="Resize Program Pal"
            aria-controls="program-pal-panel"
            aria-orientation="vertical"
            aria-valuemin={MIN_TUTOR_WIDTH}
            aria-valuemax={getMaxTutorWidth()}
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
                  {message.actionAvailable && undoFiles && (
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
                  {message.tutorialStage === "source" &&
                    programStage === "source" && (
                      <TutorialMessageAction
                        type="button"
                        disabled={actionBusy}
                        onClick={() => void runBuild()}
                      >
                        {chainAction === "build" ? "Building…" : "Build now"}
                        <span>⌘</span>
                      </TutorialMessageAction>
                    )}
                  {message.tutorialStage === "built" &&
                    programStage === "built" && (
                      <TutorialMessageAction
                        type="button"
                        disabled={actionBusy}
                        onClick={() => void runDeploy()}
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
                        onClick={() => void runOpenInteraction()}
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
                  <button onClick={() => setPatch(null)}>Not now</button>
                  <PrimaryButton onClick={applyPatch}>
                    Apply change
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

          <Composer onSubmit={submitChat}>
            <textarea
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitChat(event as any);
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
      </Body>
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
            current.includes(example.id) ? current : [...current, example.id]
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
    </Shell>
  );
};

const NEW_PROGRAM_FILES: Array<[string, string]> = [
  [
    "src/lib.rs",
    `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod my_program {
    use super::*;

    pub fn start(_ctx: Context<Start>) -> Result<()> {
        msg!("My first instruction ran!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Start {}
`,
  ],
  [
    "tests/start.test.ts",
    `describe("My program", () => {
  it("runs the starter instruction", async () => {
    const signature = await pg.program.methods.start().rpc();
    console.log("Transaction:", signature);
  });
});
`,
  ],
];

const validateWorkspacePatch = (value: Record<string, any>): WorkspacePatch => {
  const files = Array.isArray(value.files) ? value.files : [];
  if (!files.length || files.length > 16) {
    throw new Error("The tutor proposed an invalid number of files.");
  }
  for (const file of files) {
    const path = typeof file.path === "string" ? file.path : "";
    const validRoot = path.startsWith("src/") || path.startsWith("tests/");
    if (
      !validRoot ||
      path.includes("..") ||
      path.includes("//") ||
      typeof file.content !== "string" ||
      file.content.length > 128 * 1024
    ) {
      throw new Error("The tutor proposed an unsafe workspace path.");
    }
  }
  return {
    title:
      typeof value.title === "string" ? value.title : "Tutor code proposal",
    explanation: typeof value.explanation === "string" ? value.explanation : "",
    learningObjective:
      typeof value.learningObjective === "string"
        ? value.learningObjective
        : "",
    files,
  };
};

const welcomeMessage = (lesson: LearningExample): TutorMessage => ({
  id: randomId(),
  role: "tutor",
  text: `Welcome to **${lesson.title}**. ${lesson.description}\n\nI can explain any line, change the program with you, or drive the build → deploy → interact loop. You will always preview code edits before they land.`,
});

const createWorkspaceLearningState = (
  workspaceName: string
): WorkspaceLearningState => {
  const workspaceLesson = LEARNING_EXAMPLES.find(
    (example) => example.workspaceName === workspaceName
  );
  return {
    messages: workspaceLesson
      ? [welcomeMessage(workspaceLesson)]
      : [
          {
            id: randomId(),
            role: "tutor",
            text: "This is your new program. Tell me what you want to make—even a rough idea is enough. I’ll turn it into small, explainable steps and propose every code change for review.",
          },
        ],
    previousResponseId: undefined,
    patch: null,
    undoFiles: null,
    events: [
      createEvent(
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

const createEvent = (
  kind: LearningEvent["kind"],
  title: string,
  detail: string,
  status: LearningEvent["status"],
  diagnostic?: string,
  explorerUrl?: string
): LearningEvent => ({
  id: randomId(),
  kind,
  title,
  detail,
  diagnostic,
  explorerUrl,
  status,
  time: Date.now(),
});

const randomId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const shortAddress = (address: string) =>
  address ? `${address.slice(0, 4)}…${address.slice(-4)}` : "pending";

const getExplorerTransactionUrl = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${encodeURIComponent(
    PgSettings.connection.endpoint || SURFPOOL_RPC_URL
  )}`;

const getExplorerAddressUrl = (address: string) =>
  `https://explorer.solana.com/address/${address}?cluster=custom&customUrl=${encodeURIComponent(
    PgSettings.connection.endpoint || SURFPOOL_RPC_URL
  )}`;

const normalizeRpcUrl = (value: string) => {
  const normalized = new URL(value.trim());
  if (normalized.protocol !== "http:" && normalized.protocol !== "https:") {
    throw new Error("Use an HTTP or HTTPS Solana RPC URL.");
  }
  return normalized.toString();
};

const formatRpcLabel = (value: string) => {
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return value.replace(/^https?:\/\//, "").split(/[?#]/, 1)[0];
  }
};

const humanizeInstructionName = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());

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

const ensureSurfpoolWallet = () => {
  let keypair: InstanceType<typeof PgWeb3.Keypair>;
  const saved = localStorage.getItem(SURFPOOL_WALLET_KEY);
  if (saved) {
    keypair = PgWeb3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(saved)));
  } else {
    keypair = PgWeb3.Keypair.generate();
    localStorage.setItem(
      SURFPOOL_WALLET_KEY,
      JSON.stringify(Array.from(keypair.secretKey))
    );
  }

  const index = PgWallet.accounts.findIndex((account) =>
    PgWallet.create(account).publicKey.equals(keypair.publicKey)
  );
  if (index === -1) {
    PgWallet.add({ name: SURFPOOL_WALLET_NAME, keypair });
  } else {
    PgWallet.switch(index);
    if (PgWallet.accounts[index].name !== SURFPOOL_WALLET_NAME) {
      PgWallet.rename(SURFPOOL_WALLET_NAME, index);
    }
  }
  PgWallet.state = "pg";
  return keypair;
};

type LessonProgress = Partial<
  Record<LearningExample["id"], "built" | "deployed">
>;

const readLessonProgress = (): LessonProgress => {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}");
  } catch {
    return {};
  }
};

const markLessonProgress = (
  lesson: LearningExample["id"],
  state: "built" | "deployed"
) => {
  const progress = readLessonProgress();
  progress[lesson] = state;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
};

const eventGlyph = (kind: LearningEvent["kind"]) =>
  ({
    network: "≋",
    build: "⌘",
    deploy: "↗",
    instruction: "◎",
    idea: "✦",
  }[kind]);

const cleanTerminalOutput = (message: string) => {
  let clean = "";
  let inEscapeSequence = false;

  for (const character of message) {
    if (character.charCodeAt(0) === 27) {
      inEscapeSequence = true;
      continue;
    }
    if (inEscapeSequence) {
      if (/[A-Za-z]/.test(character)) inEscapeSequence = false;
      continue;
    }
    if (character !== "\r") clean += character;
  }

  return clean.split("\n").filter((line) => line.length > 0);
};

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const reveal = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slidePanel = keyframes`
  from { opacity: 0; transform: translateX(2rem); }
  to { opacity: 1; transform: translateX(0); }
`;

const LearningGlobals = createGlobalStyle<{ $mode: "light" | "dark" }>`
  body {
    background: ${({ $mode }) => ($mode === "dark" ? "#030711" : "#f8fafc")};
  }

  * {
    box-sizing: border-box;
  }
`;

const Shell = styled.div`
  --ink: #f7f7fb;
  --muted: #8b94a7;
  --line: #1f2939;
  --line-strong: #314057;
  --page: #030711;
  --header: rgba(3, 7, 17, 0.9);
  --panel: #070d19;
  --panel-raised: #101322;
  --panel-soft: #0b111e;
  --hover: #111a2a;
  --editor: #050b17;
  --disabled: #121827;
  --disabled-ink: #657086;
  --accent: #8b5cf6;
  --acid: #4bf293;
  --orange: #ff69a6;
  --aqua: #25d9e8;
  --pink: #ff4f91;
  --error: #ff5d73;
  --gradient: linear-gradient(115deg, #8b3dff 0%, #7c52ff 52%, #20c9e7 100%);
  --lesson-gradient: linear-gradient(
    112deg,
    rgba(11, 31, 47, 0.96) 0%,
    rgba(10, 75, 68, 0.96) 68%,
    rgba(35, 231, 170, 0.58) 100%
  );
  --callout-surface: #141b2a;
  --callout-kicker: #8fffd0;
  --callout-muted: #d6dbea;
  --callout-action: #55f3a1;
  --callout-action-ink: #07130d;
  --shadow: 0 18px 50px rgba(0, 0, 0, 0.22);

  &[data-theme="light"] {
    --ink: #121620;
    --muted: #687286;
    --line: #e1e6ef;
    --line-strong: #cbd3df;
    --page: #fafbfe;
    --header: rgba(250, 251, 254, 0.9);
    --panel: #ffffff;
    --panel-raised: #f5f2ff;
    --panel-soft: #f8fafc;
    --hover: #f2f5f9;
    --editor: #ffffff;
    --disabled: #f2f4f7;
    --disabled-ink: #a3aab7;
    --accent: #8757f5;
    --acid: #28c769;
    --orange: #aa45eb;
    --aqua: #16b8c7;
    --pink: #ec4b91;
    --error: #d92d4b;
    --gradient: linear-gradient(115deg, #7357f7 0%, #9d45e8 100%);
    --lesson-gradient: linear-gradient(
      112deg,
      #82ecc5 0%,
      #b5f07e 48%,
      #ffe769 100%
    );
    --callout-surface: #f1eff8;
    --callout-kicker: #551ba7;
    --callout-muted: #553f63;
    --callout-action: #5625a8;
    --callout-action-ink: #ffffff;
    --shadow: 0 12px 32px rgba(24, 35, 55, 0.08);
  }

  position: fixed;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--ink);
  background: radial-gradient(
      circle at 55% -12%,
      rgba(105, 80, 244, 0.08),
      transparent 34rem
    ),
    var(--page);
  font-family: Inter, "SF Pro Display", -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
  transition: color 180ms ease, background 180ms ease;
`;

const Header = styled.header`
  min-height: 5.25rem;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 0 1.8rem;
  background: var(--header);
  backdrop-filter: blur(18px);

  @media (max-width: 720px) {
    min-height: 4.4rem;
    gap: 0.55rem;
    padding: 0 0.7rem;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
`;

const BrandMark = styled.div`
  width: 2.2rem;
  height: 2.2rem;
  position: relative;
  transform: rotate(-8deg);

  span {
    position: absolute;
    left: 0.15rem;
    width: 1.9rem;
    height: 0.42rem;
    border-radius: 1rem;
    background: var(--acid);

    &:nth-child(1) {
      top: 0.25rem;
      transform: translateX(-0.16rem);
    }
    &:nth-child(2) {
      top: 0.88rem;
      background: var(--aqua);
    }
    &:nth-child(3) {
      top: 1.5rem;
      transform: translateX(0.16rem);
      background: var(--pink);
    }
  }
`;

const BrandCopy = styled.div`
  display: flex;
  flex-direction: column;
  line-height: 1.05;

  strong {
    font-size: 1.18rem;
    font-weight: 750;
    letter-spacing: -0.035em;
  }

  small {
    margin-top: 0.28rem;
    color: var(--muted);
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
    font-size: 0.6rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  @media (max-width: 720px) {
    display: none;
  }
`;

const HeaderActions = styled.div`
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 0.65rem;
`;

const NetworkControl = styled.div`
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 0.4rem;
`;

const RpcSettingsButton = styled.button`
  min-width: 2.8rem;
  padding: 0 0.65rem;
  border: 1px solid var(--line);
  border-radius: 0.7rem;
  color: var(--muted);
  background: var(--panel);
  font: 800 0.58rem "JetBrains Mono", "SFMono-Regular", monospace;
  letter-spacing: 0.08em;
  cursor: pointer;

  &:hover,
  &[aria-expanded="true"] {
    border-color: var(--accent);
    color: var(--accent);
  }
`;

const RpcPopover = styled.form`
  position: absolute;
  top: calc(100% + 0.65rem);
  right: 0;
  z-index: 70;
  width: min(25rem, calc(100vw - 1.4rem));
  padding: 1rem;
  border: 1px solid var(--line-strong);
  border-radius: 0.9rem;
  color: var(--ink);
  background: var(--panel);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);

  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;

    button {
      width: 1.8rem;
      height: 1.8rem;
      border: 0;
      border-radius: 50%;
      color: var(--muted);
      background: var(--panel-soft);
      font: inherit;
      cursor: pointer;
    }
  }

  > strong {
    display: block;
    margin-top: 0.45rem;
    font-size: 0.95rem;
  }

  > p {
    margin: 0.3rem 0 0.8rem;
    color: var(--muted);
    font-size: 0.66rem;
    line-height: 1.5;
  }

  > label {
    display: grid;
    gap: 0.35rem;

    span {
      color: var(--muted);
      font: 750 0.56rem "JetBrains Mono", "SFMono-Regular", monospace;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    input {
      min-width: 0;
      height: 2.65rem;
      padding: 0 0.7rem;
      border: 1px solid var(--line);
      border-radius: 0.6rem;
      outline: 0;
      color: var(--ink);
      background: var(--panel-soft);
      font: 0.67rem "JetBrains Mono", "SFMono-Regular", monospace;

      &:focus {
        border-color: var(--accent);
      }
    }
  }

  > small {
    display: block;
    margin-top: 0.5rem;
    color: var(--error);
    font-size: 0.62rem;
    line-height: 1.4;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.8rem;

    button {
      min-height: 2.35rem;
      padding: 0 0.75rem;
      border: 1px solid var(--line);
      border-radius: 0.55rem;
      color: var(--ink);
      background: var(--panel-soft);
      font: inherit;
      font-size: 0.63rem;
      font-weight: 800;
      cursor: pointer;

      &[type="submit"] {
        border-color: transparent;
        color: #07130d;
        background: var(--acid);
      }

      &:disabled {
        cursor: wait;
        opacity: 0.55;
      }
    }
  }
`;

const ConnectedStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.55rem;
  max-width: min(42rem, 62vw);
  padding: 0.65rem 0.9rem;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  color: var(--muted);
  background: var(--panel);
  box-shadow: var(--shadow);
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.63rem;

  a {
    color: var(--acid);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover {
      text-decoration: underline;
      text-underline-offset: 0.2rem;
    }
  }

  @media (max-width: 720px) {
    max-width: 7.5rem;
    padding: 0.55rem 0.65rem;

    > span {
      display: none;
    }
  }
`;

const ThemeToggle = styled.button`
  width: 2.55rem;
  height: 2.55rem;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  background: var(--panel);
  color: var(--ink);
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: 150ms ease;

  span {
    font-size: 1rem;
    line-height: 1;
  }

  &:hover {
    border-color: var(--accent);
    color: var(--accent);
    transform: translateY(-1px);
  }
`;

const PrimaryButton = styled.button`
  border: 0;
  border-radius: 0.65rem;
  padding: 0.68rem 0.9rem;
  background: var(--gradient);
  color: #ffffff;
  font: inherit;
  font-size: 0.68rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(126, 71, 244, 0.2);

  &:hover:not(:disabled) {
    transform: translate(-1px, -1px);
  }
  &:disabled {
    cursor: wait;
    opacity: 0.55;
  }
`;

const MobileTabs = styled.nav`
  display: none;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid var(--line);

  button {
    padding: 0.75rem;
    border: 0;
    border-right: 1px solid var(--line);
    background: var(--panel);
    color: var(--muted);
    font: inherit;
    font-size: 0.66rem;
    text-transform: uppercase;

    &.active {
      color: var(--accent);
      box-shadow: inset 0 -2px var(--accent);
    }
  }

  @media (max-width: 1100px) {
    display: grid;
  }
`;

const Body = styled.main<{ $tutorWidth: number }>`
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns:
    clamp(12rem, 18vw, 19rem)
    minmax(18rem, 1fr)
    ${({ $tutorWidth }) => $tutorWidth}px;
  gap: 1rem;
  padding: 0 1.25rem 1rem;
  overflow: hidden;

  @media (max-width: 1280px) {
    gap: 0.7rem;
  }

  @media (max-width: 1100px) {
    display: block;
    padding: 0;
  }
`;

const panelVisibility = css<{ visible: boolean }>`
  @media (max-width: 1100px) {
    ${({ visible }) => !visible && "display: none !important;"}
    width: 100%;
    height: 100%;
  }
`;

const LessonRail = styled.aside<{ visible: boolean }>`
  ${panelVisibility};
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 1rem;
  background: var(--panel);
  box-shadow: var(--shadow);
`;

const Kicker = styled.span`
  color: var(--accent);
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const ChapterList = styled.div`
  min-height: 0;
  flex: 1;
  padding: 1.15rem 0.95rem;
  overflow: auto;
`;

const LearningKindTabs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: 0 0 auto;
  padding: 0.7rem 0.75rem 0;
  border-bottom: 1px solid var(--line);

  button {
    min-width: 0;
    min-height: 2.7rem;
    padding: 0 0.45rem;
    border: 0;
    border-bottom: 2px solid transparent;
    color: var(--muted);
    background: transparent;
    font: inherit;
    font-size: 0.68rem;
    font-weight: 780;
    cursor: pointer;

    span {
      display: inline-grid;
      min-width: 1.15rem;
      height: 1.15rem;
      place-items: center;
      margin-left: 0.3rem;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--accent);
      font-family: "JetBrains Mono", "SFMono-Regular", monospace;
      font-size: 0.5rem;
    }

    &:hover,
    &.active {
      color: var(--ink);
    }

    &.active {
      border-bottom-color: var(--accent);
    }
  }
`;

const SidebarEmpty = styled.div`
  min-height: 13rem;
  display: grid;
  place-content: center;
  justify-items: center;
  padding: 1.5rem 0.75rem;
  color: var(--muted);
  text-align: center;

  > span {
    color: var(--accent);
    font-size: 1.15rem;
  }

  strong {
    margin-top: 0.65rem;
    color: var(--ink);
    font-size: 0.76rem;
  }

  p {
    margin: 0.35rem 0 0;
    font-size: 0.64rem;
    line-height: 1.5;
  }
`;

const ImportShelf = styled.div`
  flex: 0 0 auto;
  padding: 0.75rem;
  border-top: 1px solid var(--line);
  background: var(--panel-soft);

  > button {
    width: 100%;
    min-height: 3.7rem;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.7rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.75rem;
    color: var(--ink);
    background: var(--panel);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: 150ms ease;

    > span {
      width: 2rem;
      height: 2rem;
      display: grid;
      place-items: center;
      border: 1px solid var(--accent);
      border-radius: 50%;
      color: var(--accent);
      font-size: 1rem;
    }

    strong {
      font-size: 0.75rem;
    }

    b {
      color: var(--accent);
      font-size: 0.9rem;
    }

    &:hover {
      border-color: var(--accent);
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
    }
  }
`;

const ChapterButton = styled.button<{ active: boolean }>`
  width: 100%;
  display: grid;
  grid-template-columns: 2.8rem 1fr auto;
  align-items: center;
  gap: 0.78rem;
  min-height: 5rem;
  padding: 0.9rem 0.9rem;
  border: 1px solid ${({ active }) => (active ? "transparent" : "transparent")};
  border-radius: 0.85rem;
  background: ${({ active }) =>
    active ? "var(--lesson-gradient)" : "transparent"};
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition: 160ms ease;

  & + & {
    margin-top: 0.42rem;
  }
  &:hover {
    background: ${({ active }) =>
      active ? "var(--lesson-gradient)" : "var(--hover)"};
    border-color: ${({ active }) => (active ? "transparent" : "var(--line)")};
    transform: translateY(-1px);
  }

  ${({ active }) =>
    active &&
    css`
      box-shadow: inset 0 0 0 1px rgba(64, 244, 180, 0.25),
        0 12px 30px rgba(32, 217, 176, 0.12);

      &::after {
        content: "→";
        justify-self: end;
        color: var(--acid);
        font-size: 1.1rem;
      }
    `}

  > span:last-child {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.18rem;

    small {
      color: ${({ active }) => (active ? "var(--ink)" : "var(--muted)")};
      font-size: 0.6rem;
      text-transform: uppercase;
      white-space: nowrap;
      opacity: ${({ active }) => (active ? 0.74 : 1)};
    }

    strong {
      font-size: 0.82rem;
      letter-spacing: -0.015em;
    }
  }
`;

const ChapterNumber = styled.span`
  width: 2.65rem;
  height: 2.65rem;
  display: grid;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.72rem;
`;

const CustomProgramNumber = styled(ChapterNumber)`
  border-color: #a78bfa;
  color: #fff;
  background: #7c3aed;
  box-shadow: 0 0 0 0.24rem color-mix(in srgb, #8b5cf6 16%, transparent);
`;

const CustomProgramCopy = styled.span`
  min-width: 0;

  small {
    color: #a78bfa !important;
    font-weight: 850;
    letter-spacing: 0.08em;
  }

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Workbench = styled.section<{
  visible: boolean;
  $timelineHeight: number;
  $showExperiment: boolean;
}>`
  ${panelVisibility};
  position: relative;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: ${({ $timelineHeight, $showExperiment }) =>
    $showExperiment
      ? `auto minmax(14rem, 1fr) auto ${$timelineHeight}px`
      : `auto minmax(14rem, 1fr) ${$timelineHeight}px`};
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 1rem;
  background: var(--panel);
  box-shadow: var(--shadow);
`;

const InlineInteractionDrawer = styled.aside`
  position: absolute;
  inset: 0 0 0 auto;
  z-index: 12;
  width: min(35rem, 92%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--panel);
  box-shadow: -24px 0 60px rgba(0, 0, 0, 0.34);
  animation: ${slidePanel} 220ms ease both;

  @media (max-width: 720px) {
    width: 100%;
  }
`;

const LearningWalletPanel = styled.aside`
  position: absolute;
  z-index: 11;
  top: 5rem;
  right: 1rem;
  width: min(22rem, calc(100% - 2rem));
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 0.9rem;
  background: var(--panel-raised);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.42);
  animation: ${reveal} 180ms ease both;
`;

const LearningWalletHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1rem 0.8rem;
  border-bottom: 1px solid var(--line);

  h3 {
    margin: 0;
    font-size: 1rem;
    letter-spacing: -0.025em;
  }

  > button {
    width: 1.75rem;
    height: 1.75rem;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--hover);
    color: var(--muted);
    font: inherit;
    font-size: 1.05rem;
    cursor: pointer;

    &:hover {
      color: var(--ink);
      background: color-mix(in srgb, var(--muted) 20%, transparent);
    }
  }
`;

const LearningWalletBalance = styled.div`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-bottom: 1px solid var(--line);

  span,
  small {
    color: var(--muted);
    font-size: 0.64rem;
  }

  strong {
    margin: 0.25rem 0 0.12rem;
    color: var(--acid);
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
    font-size: 1.45rem;
    letter-spacing: -0.04em;
  }
`;

const LearningWalletAddress = styled.div`
  padding: 0.9rem 1rem;

  > span {
    color: var(--muted);
    font-size: 0.64rem;
  }

  code {
    display: block;
    margin: 0.42rem 0 0.7rem;
    padding: 0.62rem 0.7rem;
    overflow: hidden;
    border-radius: 0.5rem;
    color: var(--ink);
    background: var(--editor);
    font: 0.65rem/1.45 "JetBrains Mono", "SFMono-Regular", monospace;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  div {
    display: flex;
    gap: 0.5rem;
  }

  button,
  a {
    flex: 1;
    min-height: 2.15rem;
    display: grid;
    place-items: center;
    padding: 0.5rem 0.65rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.5rem;
    background: var(--panel);
    color: var(--ink);
    font: inherit;
    font-size: 0.64rem;
    font-weight: 750;
    text-align: center;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
  }
`;

const LearningWalletNote = styled.p`
  margin: 0;
  padding: 0.78rem 1rem 0.9rem;
  border-top: 1px solid var(--line);
  color: var(--muted);
  background: var(--panel-soft);
  font-size: 0.62rem;
  line-height: 1.5;
`;

const InteractionDrawerHeader = styled.header`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  padding: 1.2rem 1.25rem 1rem;
  border-bottom: 1px solid var(--line);
  background: var(--panel-raised);

  h3 {
    margin: 0.35rem 0 0.25rem;
    font-size: 1.25rem;
    letter-spacing: -0.025em;
  }

  p {
    max-width: 30rem;
    margin: 0;
    color: var(--muted);
    font-size: 0.76rem;
    line-height: 1.55;
  }

  > button {
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: 50%;
    background: var(--hover);
    color: var(--ink);
    font: inherit;
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;

    &:hover {
      background: var(--accent);
      color: #ffffff;
    }
  }
`;

const InteractionMeta = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--line);
  font-size: 0.68rem;

  span {
    color: var(--muted);
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const InteractionTestBar = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  margin: 0.9rem 1rem 0;
  padding: 0.9rem 1rem;
  border-radius: 0.75rem;
  background: var(--callout-surface);

  > div {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.18rem;

    strong {
      color: var(--ink);
      font-size: 0.78rem;
    }

    > span:last-child {
      color: var(--muted);
      font-size: 0.65rem;
      line-height: 1.45;
    }
  }

  > button {
    min-height: 2.45rem;
    padding: 0 0.85rem;
    border: 0;
    border-radius: 0.55rem;
    color: var(--callout-action-ink);
    background: var(--callout-action);
    font: inherit;
    font-size: 0.68rem;
    font-weight: 850;
    cursor: pointer;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    &:disabled {
      cursor: wait;
      opacity: 0.55;
    }
  }

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const InteractionReceipt = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.18rem 0.75rem;
  margin: 0.85rem 1rem 0;
  padding: 0.8rem 0.9rem;
  border-radius: 0.65rem;
  background: rgba(75, 242, 147, 0.1);

  span {
    grid-column: 1 / -1;
    color: var(--acid);
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  strong {
    font-size: 0.76rem;
  }

  a {
    color: var(--acid);
    font-size: 0.68rem;
    font-weight: 750;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const InlineInstructionList = styled.div`
  flex: 1;
  overflow: auto;
  padding: 0.8rem 0;

  > div {
    border-color: var(--line);
  }
`;

const InteractionDrawerFooter = styled.footer`
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--line);
  color: var(--muted);
  background: var(--panel-soft);
  font-size: 0.68rem;
  line-height: 1.45;
`;

const WorkbenchTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--line);

  @media (max-width: 1100px) {
    display: grid;
    align-items: stretch;
    gap: 0.75rem;
  }
`;

const LessonHeading = styled.div`
  span {
    color: var(--accent);
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
    font-size: 0.66rem;
    font-weight: bold;
    letter-spacing: 0.12em;
  }

  h2 {
    margin: 0.28rem 0 0;
    font-size: 1.55rem;
    font-weight: 720;
    letter-spacing: -0.04em;
  }
`;

const ActionStrip = styled.div`
  display: flex;
  gap: 0.55rem;

  @media (max-width: 1100px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));

    > button,
    > span,
    > span > button {
      width: 100%;
    }

    button {
      justify-content: center;
    }
  }
`;

const ActionHint = styled.span`
  display: inline-flex;
`;

const ActionButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.42rem;
  min-height: 2.65rem;
  padding: 0.58rem 0.82rem;
  border: 1px solid var(--line);
  border-radius: 0.65rem;
  background: var(--panel);
  color: var(--ink);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 650;
  cursor: pointer;
  transition: 150ms ease;

  span {
    color: var(--accent);
  }
  &:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }

  &:disabled {
    border-color: var(--line);
    background: var(--disabled);
    color: var(--disabled-ink);
    cursor: not-allowed;
    transform: none;

    span {
      color: var(--disabled-ink);
    }
  }

  ${({ $active }) =>
    $active &&
    css`
      border-color: transparent;
      background: var(--gradient);
      color: #ffffff;
      box-shadow: 0 8px 20px rgba(126, 71, 244, 0.2);

      span {
        color: #ffffff;
      }
    `}
`;

const EditorFrame = styled.div<{ ready: boolean }>`
  min-height: 0;
  position: relative;
  border-bottom: 1px solid var(--line);
  background: var(--editor);

  ${({ ready }) =>
    ready &&
    css`
      animation: ${reveal} 260ms ease both;
    `}
`;

const EditorLoading = styled.div`
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 0.68rem;
`;

const Experiment = styled.div`
  position: relative;
  width: calc(100% - 2rem);
  min-width: 0;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.8rem;
  margin: 0.7rem 1rem;
  padding: 0.82rem 3.25rem 0.82rem 1rem;
  border: 0;
  border-radius: 0.8rem;
  background: var(--callout-surface);

  > div:nth-child(2) {
    min-width: 0;
  }

  > div:nth-child(2) > ${Kicker} {
    color: var(--callout-kicker);
  }

  strong {
    display: block;
    margin-top: 0.18rem;
    font-size: 0.84rem;
  }

  p {
    margin: 0.25rem 0 0;
    color: var(--callout-muted);
    font-size: 0.66rem;
    line-height: 1.45;
  }

  @media (max-width: 560px) {
    grid-template-columns: auto 1fr;

    > .experiment-action {
      grid-column: 1 / -1;
    }
  }
`;

const ExperimentIcon = styled.div`
  width: 2.2rem;
  height: 2.2rem;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: var(--acid);
  background: color-mix(in srgb, var(--acid) 12%, transparent);
`;

const DoItButton = styled.button`
  border: 0;
  border-radius: 0.55rem;
  padding: 0.55rem 0.72rem;
  background: var(--callout-action);
  color: var(--callout-action-ink);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 150ms ease, box-shadow 150ms ease;

  span {
    margin-left: 0.3rem;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 7px 16px rgba(22, 12, 52, 0.2);
  }
`;

const ExperimentDismissButton = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.55rem;
  width: 1.55rem;
  height: 1.55rem;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--muted) 14%, transparent);
  color: var(--muted);
  font: inherit;
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
  transition: 140ms ease;

  &:hover,
  &:focus-visible {
    background: color-mix(in srgb, var(--muted) 24%, transparent);
    color: var(--ink);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

const Timeline = styled.div`
  position: relative;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--line);
  background: var(--panel);
`;

const TimelineResizeHandle = styled.button`
  position: absolute;
  z-index: 5;
  top: -0.5rem;
  left: 0;
  width: 100%;
  height: 1rem;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: row-resize;
  touch-action: none;

  &::after {
    content: "";
    position: absolute;
    top: calc(50% - 1px);
    left: 50%;
    width: 3.5rem;
    height: 2px;
    border-radius: 999px;
    background: var(--line-strong);
    opacity: 0.72;
    transform: translateX(-50%);
    transition: width 150ms ease, background 150ms ease, opacity 150ms ease;
  }

  &:hover::after,
  &:focus-visible::after {
    width: 5rem;
    background: var(--accent);
    opacity: 1;
  }

  &:focus-visible {
    outline: none;
  }
`;

const TimelineHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.55rem 0.8rem;
  border-bottom: 1px solid var(--line);
  font-size: 0.64rem;
  letter-spacing: 0.1em;

  > button {
    border: 0;
    background: none;
    color: var(--muted);
    font: inherit;
    font-size: 0.64rem;
    cursor: pointer;
    &:disabled {
      opacity: 0.35;
    }
  }
`;

const TimelineTabs = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const TimelineTab = styled.button<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid
    ${({ active }) => (active ? "var(--line-strong)" : "transparent")};
  border-radius: 0.4rem 0.4rem 0 0;
  background: ${({ active }) => (active ? "var(--panel-soft)" : "transparent")};
  color: ${({ active }) => (active ? "var(--ink)" : "var(--muted)")};
  font: inherit;
  font-size: 0.64rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;

  &:hover {
    color: var(--ink);
  }
`;

const EventList = styled.div`
  overflow: auto;
`;

const EventRow = styled.div<{ status: LearningEvent["status"] }>`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: 0.65rem;
  padding: 0.58rem 0.8rem;
  border-bottom: 1px solid var(--line);

  > div:nth-child(2) {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;

    strong {
      font-size: 0.72rem;
    }
    span {
      color: var(--muted);
      font-size: 0.64rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  time {
    color: var(--muted);
    font-size: 0.6rem;
  }
`;

const EventCopy = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`;

const EventExplorerLink = styled.a`
  width: fit-content;
  margin-top: 0.28rem;
  color: var(--accent);
  font-size: 0.64rem;
  font-weight: 750;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const NoteActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.4rem;

  button {
    padding: 0.32rem 0.55rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.4rem;
    background: var(--panel-soft);
    color: var(--ink);
    font: inherit;
    font-size: 0.62rem;
    font-weight: 700;
    cursor: pointer;

    &:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }
`;

const EventGlyph = styled.span<{ status: LearningEvent["status"] }>`
  color: ${({ status }) => {
    switch (status) {
      case "error":
        return "var(--error)";
      case "success":
        return "var(--acid)";
      default:
        return "var(--aqua)";
    }
  }};
  font-size: 0.8rem;
`;

const WorkingSpinner = styled.span`
  width: 0.72rem;
  height: 0.72rem;
  margin-top: 0.08rem;
  border: 1px solid #3e5149;
  border-top-color: var(--aqua);
  border-radius: 50%;
  animation: ${spin} 700ms linear infinite;
`;

const VerboseLog = styled.pre`
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0.7rem 0.8rem;
  overflow: auto;
  color: var(--muted);
  background: var(--editor);
  font: 0.64rem/1.6 "JetBrains Mono", "SFMono-Regular", monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const TutorPanel = styled.aside<{ visible: boolean }>`
  ${panelVisibility};
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 1rem;
  background: radial-gradient(
      circle at 100% 0,
      rgba(126, 71, 244, 0.08),
      transparent 19rem
    ),
    var(--panel);
  box-shadow: var(--shadow);
`;

const TutorResizeHandle = styled.button`
  position: absolute;
  z-index: 5;
  top: 0;
  bottom: 0;
  left: -0.5rem;
  width: 1rem;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: col-resize;
  touch-action: none;

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    left: calc(50% - 1px);
    width: 2px;
    height: 3.5rem;
    border-radius: 999px;
    background: var(--line-strong);
    opacity: 0.72;
    transform: translateY(-50%);
    transition: height 150ms ease, background 150ms ease, opacity 150ms ease;
  }

  &:hover::after,
  &:focus-visible::after {
    height: 5rem;
    background: var(--accent);
    opacity: 1;
  }

  &:focus-visible {
    outline: none;
  }

  @media (max-width: 1100px) {
    display: none;
  }
`;

const TutorHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid var(--line);
`;

const TutorIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;

  strong {
    font-size: 0.82rem;
  }
`;

const TutorOrb = styled.div`
  width: 2.55rem;
  height: 2.55rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #29104c;
  background: linear-gradient(145deg, #69f8c1 12%, #5ed8ff 46%, #c86bff 78%);
  box-shadow: 0 0 1.5rem rgba(100, 220, 255, 0.18);
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.66rem;
  font-weight: 900;
`;

const Messages = styled.div`
  flex: 1;
  overflow: auto;
  padding: 0.9rem 0.75rem;
`;

const Message = styled.div<{ role: TutorMessage["role"] }>`
  position: relative;
  margin: 0 0 0.8rem;
  padding: 1rem;
  border: 1px solid
    ${({ role }) =>
      role === "learner" ? "var(--line-strong)" : "rgba(139, 92, 246, .24)"};
  border-radius: ${({ role }) =>
    role === "learner"
      ? ".85rem .25rem .85rem .85rem"
      : ".25rem .85rem .85rem .85rem"};
  background: ${({ role }) =>
    role === "learner"
      ? "var(--panel-soft)"
      : "linear-gradient(135deg, var(--panel-raised), var(--panel))"};

  p {
    margin: 0;
    font-size: 0.82rem;
    line-height: 1.7;
  }

  > div:not(:first-child) {
    font-size: 0.82rem;
    line-height: 1.7;
  }
`;

const MessageRole = styled.span`
  display: block;
  margin-bottom: 0.45rem;
  color: var(--accent);
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.12em;
`;

const TutorialStageMeta = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.65rem;
  margin: 0 0 0.8rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--line);

  > span {
    width: 2.15rem;
    height: 2.15rem;
    display: grid;
    place-items: center;
    border: 1px solid var(--accent);
    border-radius: 50%;
    color: var(--accent);
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
    font-size: 0.6rem;
    font-weight: 800;
  }

  > div {
    display: flex;
    flex-direction: column;
    gap: 0.08rem;
  }

  small {
    color: var(--muted);
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
    font-size: 0.52rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  strong {
    color: var(--ink);
    font-size: 0.76rem;
  }
`;

const TutorialMessageAction = styled.button`
  width: 100%;
  min-height: 2.65rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.9rem;
  padding: 0 0.85rem;
  border: 0;
  border-radius: 0.6rem;
  color: var(--callout-action-ink);
  background: var(--callout-action);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 850;
  cursor: pointer;

  span {
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 18px color-mix(in srgb, var(--acid) 20%, transparent);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.5;
  }
`;

const TypingStatus = styled.span`
  display: block;
  margin-top: 0.45rem;
  color: var(--muted);
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.62rem;
`;

const PatchCard = styled.div`
  margin-bottom: 0.8rem;
  padding: 0.85rem;
  border-radius: 0.75rem;
  background: var(--panel-raised);

  h3 {
    margin: 0.35rem 0;
    font-size: 0.75rem;
  }
  > p {
    color: var(--muted);
    font-size: 0.68rem;
    line-height: 1.5;
  }
`;

const LearningObjective = styled.div`
  padding: 0.55rem;
  background: rgba(200, 255, 77, 0.06);
  color: var(--muted);
  font-size: 0.66rem;
  line-height: 1.45;

  span {
    display: block;
    margin-bottom: 0.18rem;
    color: var(--acid);
    font-size: 0.56rem;
  }
`;

const PatchFiles = styled.div`
  margin: 0.65rem 0;

  div {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.45rem;
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--line);
    font-size: 0.64rem;
  }

  span {
    color: var(--acid);
  }
  code {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  small {
    color: var(--muted);
  }
`;

const PatchActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;

  > button:first-child {
    border: 0;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: 0.65rem;
    cursor: pointer;
  }
`;

const UndoCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--line-strong);
  border-radius: 0.3rem;
  color: var(--muted);
  font-size: 0.65rem;

  button {
    border: 0;
    background: none;
    color: var(--acid);
    font: inherit;
    cursor: pointer;
  }
`;

const QuickPrompts = styled.div`
  display: flex;
  gap: 0.4rem;
  padding: 0.55rem 0.75rem;
  border-top: 1px solid var(--line);

  button {
    flex: 1;
    min-height: 2.8rem;
    padding: 0.55rem;
    border: 1px solid var(--line);
    border-radius: 0.65rem;
    background: var(--panel);
    color: var(--ink);
    font: inherit;
    font-size: 0.65rem;
    cursor: pointer;

    &:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
  }
`;

const Composer = styled.form`
  margin: 0 0.75rem 0.75rem;
  border: 1px solid var(--line-strong);
  border-radius: 0.75rem;
  background: var(--panel-soft);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);

  textarea {
    width: 100%;
    resize: none;
    border: 0;
    outline: 0;
    padding: 0.7rem;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 0.72rem;
    line-height: 1.5;

    &::placeholder {
      color: var(--muted);
    }
  }
`;

const ComposerFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.42rem 0.5rem 0.48rem 0.7rem;

  span {
    color: var(--muted);
    font-size: 0.58rem;
  }

  button {
    width: 1.8rem;
    height: 1.8rem;
    border: 0;
    border-radius: 0.45rem;
    background: var(--gradient);
    color: #ffffff;
    font: inherit;
    font-weight: 900;
    cursor: pointer;

    &:disabled {
      background: var(--disabled);
      color: var(--disabled-ink);
      cursor: default;
    }
  }
`;

export default LearningShell;
