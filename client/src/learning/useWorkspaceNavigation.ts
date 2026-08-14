import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect } from "react";

import { PgExplorer, PgGithub, PgTutorial, TutorialData } from "../utils";
import { LEARNING_EXAMPLES, LearningExample } from "./examples";
import {
  CustomProgramEntry,
  getAnchorProgramName,
  renameCustomProgram,
} from "./library-state";
import { NEW_PROGRAM_FILES } from "./new-program";
import { getProgramWorkspaceName, ProgramEntry } from "./program-catalog";
import { createWorkspaceLearningState } from "./workspace-state";
import {
  CUSTOM_WORKSPACE_KEY,
  loadTutorialWorkspace,
} from "./tutorial-workspace";
import type { useLearningWorkspace } from "./useLearningWorkspace";
import type { useProgramActions } from "./useProgramActions";
import { ACTIVE_LESSON_KEY, LearningLibraryState } from "./useLearningLibrary";

type WorkspaceState = Pick<
  ReturnType<typeof useLearningWorkspace>,
  | "activeWorkspaceNameRef"
  | "addEvent"
  | "setActiveWorkspaceName"
  | "updateWorkspaceState"
  | "workspaceStatesRef"
>;

interface WorkspaceNavigationParams {
  chainActionRef: ReturnType<typeof useProgramActions>["chainActionRef"];
  library: LearningLibraryState;
  setChatInput: Dispatch<SetStateAction<string>>;
  setInteractionOpen: Dispatch<SetStateAction<boolean>>;
  setMobilePanel: Dispatch<SetStateAction<"learn" | "code" | "tutor">>;
  setWalletOpen: Dispatch<SetStateAction<boolean>>;
  workspace: WorkspaceState;
}

export const useWorkspaceNavigation = ({
  chainActionRef,
  library,
  setChatInput,
  setInteractionOpen,
  setMobilePanel,
  setWalletOpen,
  workspace,
}: WorkspaceNavigationParams) => {
  const {
    customProgram,
    customProgramsRef,
    initialCustomProgram,
    initialLessonId,
    lessonId,
    setCustomProgram,
    setCustomPrograms,
    setImportedExampleIds,
    setImportedProgramRepos,
    setImportedTutorialNames,
    setLessonId,
    setLibraryTab,
    setReady,
  } = library;
  const {
    activeWorkspaceNameRef,
    addEvent,
    setActiveWorkspaceName,
    updateWorkspaceState,
    workspaceStatesRef,
  } = workspace;

  const ensureWorkspaceState = useCallback(
    (workspaceName: string) => {
      if (!workspaceStatesRef.current[workspaceName]) {
        updateWorkspaceState(workspaceName, () =>
          createWorkspaceLearningState(workspaceName)
        );
      }
    },
    [updateWorkspaceState, workspaceStatesRef]
  );

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      await PgExplorer.init();
      const currentLesson = LEARNING_EXAMPLES.find(
        ({ id }) => id === initialLessonId.current
      )!;
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
  }, [
    activeWorkspaceNameRef,
    addEvent,
    initialCustomProgram,
    initialLessonId,
    setActiveWorkspaceName,
    setCustomProgram,
    setCustomPrograms,
    setReady,
  ]);

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
      ensureWorkspaceState(workspaceName);
      setInteractionOpen(false);
      setWalletOpen(false);
      setReady(true);
    };

    const { dispose } = PgExplorer.onDidSwitchWorkspace(syncWorkspace);
    return dispose;
  }, [
    activeWorkspaceNameRef,
    customProgramsRef,
    ensureWorkspaceState,
    setActiveWorkspaceName,
    setCustomProgram,
    setCustomPrograms,
    setInteractionOpen,
    setLessonId,
    setLibraryTab,
    setReady,
    setWalletOpen,
  ]);

  // Deploy and interaction must stay attached to their current workspace.
  const chainActionBlocks = (detail: string) => {
    if (!chainActionRef.current || chainActionRef.current.action === "build") {
      return false;
    }
    addEvent(
      chainActionRef.current.action === "deploy" ? "deploy" : "instruction",
      "Finish the current action first",
      detail,
      "idle"
    );
    return true;
  };

  const activateWorkspace = (
    workspaceName: string,
    tab: "examples" | "tutorials"
  ) => {
    localStorage.setItem(CUSTOM_WORKSPACE_KEY, workspaceName);
    setCustomProgram(workspaceName);
    setLibraryTab(tab);
    activeWorkspaceNameRef.current = workspaceName;
    setActiveWorkspaceName(workspaceName);
    ensureWorkspaceState(workspaceName);
    setInteractionOpen(false);
    setWalletOpen(false);
  };

  const selectLesson = async (next: LearningExample) => {
    if (next.id === lessonId && !customProgram) return;
    if (
      chainActionBlocks(
        "You can switch lessons while a build runs. Deploy and interaction stay on this page so wallet and program state cannot cross workspaces."
      )
    ) {
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
    ensureWorkspaceState(next.workspaceName);
    setInteractionOpen(false);
    setReady(true);
    setMobilePanel("code");
  };

  const selectTutorial = async (tutorial: TutorialData) => {
    if (
      chainActionBlocks(
        "You can open another workspace while a build runs. Deploy and interaction stay attached to their current workspace."
      )
    ) {
      return;
    }

    setReady(false);
    try {
      const workspaceName = await loadTutorialWorkspace(tutorial);
      setImportedTutorialNames((current) =>
        current.includes(tutorial.name) ? current : [...current, tutorial.name]
      );
      activateWorkspace(workspaceName, "tutorials");
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
    if (
      chainActionBlocks(
        "You can open another program while a build runs. Deploy and interaction stay attached to their current workspace."
      )
    ) {
      return;
    }

    setReady(false);
    try {
      await PgGithub.import(program.repo);
      const workspaceName = getProgramWorkspaceName(program);
      setImportedProgramRepos((current) =>
        current.includes(program.repo) ? current : [...current, program.repo]
      );
      activateWorkspace(workspaceName, "examples");
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
    if (
      chainActionBlocks(
        "You can open another program while a build runs. Deploy and interaction stay attached to their current workspace."
      )
    ) {
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
      activateWorkspace(workspaceName, "examples");
      setMobilePanel("code");
    } finally {
      setReady(true);
    }
  };

  const startNewProgram = async () => {
    if (
      chainActionBlocks(
        "You can open another program while a build runs. Deploy and interaction stay attached to their current workspace."
      )
    ) {
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
      {
        workspaceName,
        createdAt: Date.now(),
        programName: getAnchorProgramName(
          NEW_PROGRAM_FILES.find(([path]) => path === "src/lib.rs")?.[1]
        ),
      },
    ]);
    // A reused workspace name must not inherit stale chat state.
    updateWorkspaceState(workspaceName, () =>
      createWorkspaceLearningState(workspaceName)
    );
    activateWorkspace(workspaceName, "examples");
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

  return {
    selectCustomProgram,
    selectLesson,
    selectProgram,
    selectTutorial,
    startNewProgram,
  };
};
