import { useCallback, useEffect, useRef, useState } from "react";

import {
  CustomProgramEntry,
  getAnchorProgramName,
  readCustomPrograms,
  readImportedExampleIds,
  readImportedProgramRepos,
  readImportedTutorialNames,
  writeCustomPrograms,
  writeImportedExampleIds,
  writeImportedProgramRepos,
  writeImportedTutorialNames,
} from "./library-state";
import { loadProgramCatalog, ProgramEntry } from "./program-catalog";
import { CUSTOM_WORKSPACE_KEY } from "./tutorial-workspace";
import {
  getLearningExample,
  LEARNING_EXAMPLES,
  LearningExample,
} from "./examples";
import type { LearningLibraryTab } from "./ImportLibrary";
import { PgExplorer, PgTutorial } from "../utils";

export const ACTIVE_LESSON_KEY = "solpg-learning-active-lesson";
const LIBRARY_TAB_KEY = "solpg-learning-library-tab";

export const useLearningLibrary = () => {
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
  const [ready, setReady] = useState(false);
  const [libraryTab, setLibraryTab] = useState<LearningLibraryTab>(() => {
    const saved = localStorage.getItem(LIBRARY_TAB_KEY);
    if (saved === "tutorials" || saved === "examples") return saved;
    return isTutorialWorkspace ? "tutorials" : "examples";
  });
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
  const customProgramNameTimerRef = useRef<number>();

  useEffect(() => {
    localStorage.setItem(LIBRARY_TAB_KEY, libraryTab);
  }, [libraryTab]);

  useEffect(
    () => writeImportedExampleIds(importedExampleIds),
    [importedExampleIds]
  );
  useEffect(
    () => writeImportedTutorialNames(importedTutorialNames),
    [importedTutorialNames]
  );
  useEffect(
    () => writeImportedProgramRepos(importedProgramRepos),
    [importedProgramRepos]
  );

  useEffect(() => {
    customProgramsRef.current = customPrograms;
    writeCustomPrograms(customPrograms);
  }, [customPrograms]);

  const syncActiveCustomProgramName = useCallback(() => {
    const workspaceName = PgExplorer.currentWorkspaceName;
    if (!workspaceName) return;

    const programName = getAnchorProgramName(
      PgExplorer.getFileContent("src/lib.rs")
    );
    setCustomPrograms((current) =>
      current.map((program) =>
        program.workspaceName === workspaceName &&
        program.programName !== programName
          ? { ...program, programName }
          : program
      )
    );
  }, []);

  useEffect(() => {
    const scheduleSync = () => {
      window.clearTimeout(customProgramNameTimerRef.current);
      customProgramNameTimerRef.current = window.setTimeout(
        syncActiveCustomProgramName,
        80
      );
    };
    const fileContent = PgExplorer.onDidChangeFileContent(({ path }) => {
      if (path.endsWith("/src/lib.rs")) scheduleSync();
    });
    const createItem = PgExplorer.onDidCreateItem(scheduleSync);
    const switchWorkspace = PgExplorer.onDidSwitchWorkspace(scheduleSync);
    const init = PgExplorer.onDidInit(scheduleSync);
    scheduleSync();

    return () => {
      window.clearTimeout(customProgramNameTimerRef.current);
      fileContent.dispose();
      createItem.dispose();
      switchWorkspace.dispose();
      init.dispose();
    };
  }, [syncActiveCustomProgramName]);

  useEffect(() => {
    let active = true;
    loadProgramCatalog()
      .then((catalog) => {
        if (active) setPrograms(catalog);
      })
      .catch(() => {
        // New -> Programs displays the catalog error in its own surface.
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

  return {
    activeTutorial,
    customProgram,
    customPrograms,
    customProgramsRef,
    importedExampleIds,
    importedProgramRepos,
    importedTutorialNames,
    initialCustomProgram,
    initialLessonId,
    initialWorkspaceName,
    isTutorialWorkspace,
    lesson,
    lessonId,
    libraryTab,
    programs,
    ready,
    setCustomProgram,
    setCustomPrograms,
    setImportedExampleIds,
    setImportedProgramRepos,
    setImportedTutorialNames,
    setLessonId,
    setLibraryTab,
    setReady,
  };
};

export type LearningLibraryState = ReturnType<typeof useLearningLibrary>;
