import { LEARNING_EXAMPLES } from "./examples";

const IMPORTED_EXAMPLES_KEY = "solpg-learning-imported-examples-v1";
const IMPORTED_TUTORIALS_KEY = "solpg-learning-imported-tutorials-v1";
const IMPORTED_PROGRAMS_KEY = "solpg-learning-imported-programs-v1";
const CUSTOM_PROGRAMS_KEY = "solpg-learning-custom-programs-v1";
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

export type CustomProgramEntry = {
  createdAt: number;
  programName?: string;
  workspaceName: string;
};

export const getAnchorProgramName = (source?: string) => {
  if (!source) return undefined;

  const match = source.match(
    /^[\t ]*#\s*\[\s*program\s*\]\s*(?:pub(?:\s*\([^)\r\n]+\))?\s+)?mod\s+(?:r#)?([A-Za-z_][A-Za-z0-9_]*)\b/m
  );
  return match?.[1];
};

export const getCustomProgramDisplayName = (program: CustomProgramEntry) =>
  program.programName || program.workspaceName;

export const readCustomPrograms = (): CustomProgramEntry[] => {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(CUSTOM_PROGRAMS_KEY) ?? "[]"
    );
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    return parsed.reduce<CustomProgramEntry[]>((programs, value) => {
      if (
        !value ||
        typeof value !== "object" ||
        typeof value.workspaceName !== "string" ||
        !value.workspaceName.trim() ||
        typeof value.createdAt !== "number" ||
        seen.has(value.workspaceName)
      ) {
        return programs;
      }
      seen.add(value.workspaceName);
      programs.push({
        workspaceName: value.workspaceName,
        createdAt: value.createdAt,
        ...(typeof value.programName === "string" &&
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(value.programName)
          ? { programName: value.programName }
          : {}),
      });
      return programs;
    }, []);
  } catch {
    return [];
  }
};

export const writeCustomPrograms = (programs: CustomProgramEntry[]) => {
  try {
    localStorage.setItem(CUSTOM_PROGRAMS_KEY, JSON.stringify(programs));
  } catch {
    // Explorer still preserves the workspace if preference storage is full.
  }
};

export const renameCustomProgram = (
  programs: CustomProgramEntry[],
  previousWorkspaceName: string,
  workspaceName: string
) =>
  programs
    .filter((program) => program.workspaceName !== workspaceName)
    .map((program) =>
      program.workspaceName === previousWorkspaceName
        ? { ...program, workspaceName }
        : program
    );

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
