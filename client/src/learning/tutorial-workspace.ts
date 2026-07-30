import { isValidElement } from "react";

import type { TutorialComponentProps } from "../components/Tutorial/types";
import { PgExplorer, TutorialData } from "../utils";
import { rememberImportedTutorial } from "./library-state";

export const CUSTOM_WORKSPACE_KEY = "solpg-learning-custom-workspace";

const tutorialContent = new Map<string, Promise<TutorialComponentProps>>();

/** Load the original tutorial copy, sections, files, and page callbacks. */
export const getTutorialWorkspaceContent = (tutorial: TutorialData) => {
  const cached = tutorialContent.get(tutorial.name);
  if (cached) return cached;

  const content = (async () => {
    const { importComponent, ...tutorialProps } = tutorial;
    const tutorialModule = await importComponent();
    const tutorialElement = tutorialModule.default(tutorialProps);

    if (!isValidElement<TutorialComponentProps>(tutorialElement)) {
      throw new Error(`Could not read the ${tutorial.name} tutorial.`);
    }

    return tutorialElement.props;
  })();
  tutorialContent.set(tutorial.name, content);
  return content;
};

/**
 * Import a tutorial's starter files into a normal Playground workspace.
 *
 * Existing workspaces are switched to without being recreated so learner edits
 * survive navigation and reloads.
 */
export const loadTutorialWorkspace = async (tutorial: TutorialData) => {
  await PgExplorer.init();

  if (!PgExplorer.allWorkspaceNames?.includes(tutorial.name)) {
    const { files, defaultOpenFile } = await getTutorialWorkspaceContent(
      tutorial
    );
    if (!files?.length) {
      throw new Error(`${tutorial.name} does not include any workspace files.`);
    }

    await PgExplorer.createWorkspace(tutorial.name, {
      files,
      defaultOpenFile: defaultOpenFile ?? files[0][0],
    });
  } else if (PgExplorer.currentWorkspaceName !== tutorial.name) {
    await PgExplorer.switchWorkspace(tutorial.name);
  }

  localStorage.setItem(CUSTOM_WORKSPACE_KEY, tutorial.name);
  rememberImportedTutorial(tutorial.name);
  return tutorial.name;
};
