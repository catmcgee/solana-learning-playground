import { PgGithub } from "../utils";

export type ProgramEntry = {
  name: string;
  description: string;
  repo: string;
  icon: string;
  framework: string;
  categories: string[];
};

let catalogPromise: Promise<ProgramEntry[]> | undefined;

export const loadProgramCatalog = () => {
  catalogPromise ??= fetch("/programs/programs.json").then(async (response) => {
    if (!response.ok) {
      throw new Error("The program catalog is unavailable.");
    }
    return (await response.json()) as ProgramEntry[];
  });
  return catalogPromise;
};

export const getProgramWorkspaceName = (program: ProgramEntry) => {
  const { owner, repo, path } = PgGithub.parseUrl(program.repo);
  return `github-${owner}/${repo}/${path}`;
};
