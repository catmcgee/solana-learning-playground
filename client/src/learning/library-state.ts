import { LEARNING_EXAMPLES } from "./examples";

const IMPORTED_EXAMPLES_KEY = "solpg-learning-imported-examples-v1";
const IMPORTED_TUTORIALS_KEY = "solpg-learning-imported-tutorials-v1";
const IMPORTED_PROGRAMS_KEY = "solpg-learning-imported-programs-v1";
const DEFAULT_IMPORTED_TUTORIAL_NAMES = [
  "Hello Anchor",
  "Hello Seahorse",
  "Hello Solana",
];

export const readImportedExampleIds = () =>
  readList(
    IMPORTED_EXAMPLES_KEY,
    LEARNING_EXAMPLES.map((example) => example.id)
  );

export const writeImportedExampleIds = (ids: string[]) =>
  writeList(IMPORTED_EXAMPLES_KEY, ids);

export const readImportedTutorialNames = () =>
  Array.from(
    new Set([
      ...DEFAULT_IMPORTED_TUTORIAL_NAMES,
      ...readList(IMPORTED_TUTORIALS_KEY, []),
    ])
  );

export const writeImportedTutorialNames = (names: string[]) =>
  writeList(IMPORTED_TUTORIALS_KEY, names);

export const readImportedProgramRepos = () =>
  readList(IMPORTED_PROGRAMS_KEY, []);

export const writeImportedProgramRepos = (repos: string[]) =>
  writeList(IMPORTED_PROGRAMS_KEY, repos);

export const rememberImportedTutorial = (name: string) => {
  const names = readImportedTutorialNames();
  if (names.includes(name)) return names;
  const next = [...names, name];
  writeImportedTutorialNames(next);
  return next;
};

const readList = (key: string, fallback: string[]) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "null");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : fallback;
  } catch {
    return fallback;
  }
};

const writeList = (key: string, values: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(new Set(values))));
  } catch {
    // Import state is a convenience. IndexedDB still preserves the workspace.
  }
};
