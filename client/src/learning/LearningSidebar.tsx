import type { Dispatch, SetStateAction } from "react";

import type { LearningLibraryTab } from "./ImportLibrary";
import type { LearningExample } from "./examples";
import { LEARNING_EXAMPLES } from "./examples";
import type { CustomProgramEntry } from "./library-state";
import { getCustomProgramDisplayName } from "./library-state";
import type { ProgramEntry } from "./program-catalog";
import { getProgramWorkspaceName } from "./program-catalog";
import type { TutorialData } from "../utils";
import { PgTutorial } from "../utils";
import {
  ChapterButton,
  ChapterList,
  ChapterNumber,
  CustomProgramCopy,
  CustomProgramNumber,
  ImportShelf,
  LearningKindTabs,
  LessonRail,
  SidebarEmpty,
} from "./LearningShell.styles";

type LessonProgress = Partial<
  Record<LearningExample["id"], "built" | "deployed">
>;

type LearningSidebarProps = {
  customProgram: string | null;
  customPrograms: CustomProgramEntry[];
  importedExampleIds: string[];
  importedProgramRepos: string[];
  importedTutorialNames: string[];
  lessonId: LearningExample["id"];
  libraryTab: LearningLibraryTab;
  mobilePanel: "learn" | "code" | "tutor";
  programs: ProgramEntry[];
  progress: LessonProgress;
  selectCustomProgram: (program: CustomProgramEntry) => Promise<void>;
  selectLesson: (lesson: LearningExample) => Promise<void>;
  selectProgram: (program: ProgramEntry) => Promise<void>;
  selectTutorial: (tutorial: TutorialData) => Promise<void>;
  setImportLibraryMounted: Dispatch<SetStateAction<boolean>>;
  setImportLibraryOpen: Dispatch<SetStateAction<boolean>>;
  setLibraryTab: Dispatch<SetStateAction<LearningLibraryTab>>;
};

export const LearningSidebar = ({
  customProgram,
  customPrograms,
  importedExampleIds,
  importedProgramRepos,
  importedTutorialNames,
  lessonId,
  libraryTab,
  mobilePanel,
  programs,
  progress,
  selectCustomProgram,
  selectLesson,
  selectProgram,
  selectTutorial,
  setImportLibraryMounted,
  setImportLibraryOpen,
  setLibraryTab,
}: LearningSidebarProps) => (
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
                  <strong>{getCustomProgramDisplayName(program)}</strong>
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
            .filter((program) => importedProgramRepos.includes(program.repo))
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
          .filter((tutorial) => importedTutorialNames.includes(tutorial.name))
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
      <button
        type="button"
        onClick={() => {
          setImportLibraryMounted(true);
          setImportLibraryOpen(true);
        }}
      >
        <span>＋</span>
        <strong>New</strong>
        <b>→</b>
      </button>
    </ImportShelf>
  </LessonRail>
);
