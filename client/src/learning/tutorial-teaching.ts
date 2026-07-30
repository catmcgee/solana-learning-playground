import type { TutorialComponentProps } from "../components/Tutorial/types";
import type { TutorialData } from "../utils";

export type TutorialTeachingStage = "source" | "built" | "deployed";

export type TutorialTeaching = {
  source: string;
  built: string;
  deployed: string;
  clientPageIndexes: number[];
};

type TextPage = {
  index: number;
  title: string;
  content: string;
};

/**
 * Reframe the original tutorial pages as a learn-by-doing conversation.
 *
 * Older Playground tutorials use several different page structures. This
 * classifier keeps their authored program and client material, but replaces
 * stale build/deploy instructions with the current Surfpool workflow.
 */
export const createTutorialTeaching = (
  tutorial: TutorialData,
  content: TutorialComponentProps
): TutorialTeaching => {
  const about =
    typeof content.about === "string"
      ? normalizeTutorialCopy(content.about)
      : tutorial.description;
  const pages: TextPage[] = content.pages.flatMap((page, index) => {
    if (typeof page.content !== "string") return [];
    const pageCopy = normalizeTutorialCopy(page.content);
    return [
      {
        index,
        title: page.title ?? firstHeading(pageCopy) ?? `Part ${index + 1}`,
        content: pageCopy,
      },
    ];
  });

  const programParts: string[] = [];
  const buildParts: string[] = [];
  const clientParts: string[] = [];
  const clientPageIndexes: number[] = [];

  for (const page of pages) {
    const label = `${page.title}\n${firstHeading(page.content) ?? ""}`;
    const combinedBuildDeploy =
      /\bbuild\b/i.test(label) && /\bdeploy\b/i.test(label);
    const clientPage = isClientPage(label);
    const deployPage = /\bdeploy\b/i.test(label) && !combinedBuildDeploy;
    const buildPage = /\bbuild\b/i.test(label) && !combinedBuildDeploy;

    if (clientPage) {
      clientParts.push(section(page.title, page.content));
      clientPageIndexes.push(page.index);
      continue;
    }

    if (combinedBuildDeploy) {
      const [buildCopy] = splitAtHeading(page.content, /\bdeploy\b/i);
      if (buildCopy.trim()) buildParts.push(buildCopy.trim());
      continue;
    }

    if (deployPage) continue;
    if (buildPage) {
      buildParts.push(page.content);
      continue;
    }

    programParts.push(section(page.title, page.content));
  }

  const programCopy = programParts.length
    ? programParts.join("\n\n")
    : "Open the program files beside this conversation. Start with the entrypoint, then trace the accounts and data each instruction uses.";
  const authoredBuildCopy = buildParts.length
    ? `\n\n${buildParts.join("\n\n")}`
    : "";
  const clientCopy = clientParts.length
    ? clientParts.join("\n\n")
    : [
        "The generated IDL now describes every callable instruction.",
        "Open **Interact** to fill in its arguments and accounts, or use **Run tests** there to execute the tutorial's client code against Surfpool.",
      ].join("\n\n");

  return {
    source: [
      `# ${tutorial.name}`,
      "## Overview",
      about,
      "## Program",
      programCopy,
      "## Build",
      "When the program makes sense, click **Build** above the editor. Rust will compile the program and Playground will generate the IDL used by Interact.",
      authoredBuildCopy,
    ]
      .filter(Boolean)
      .join("\n\n"),
    built: [
      "## Build complete",
      "The program compiled successfully and its IDL is ready.",
      "## Deploy",
      "Click **Deploy** above the editor. Playground will publish the compiled program to the connected Surfpool and keep you on this page. No faucet or airdrop is required for this learning network.",
    ].join("\n\n"),
    deployed: [
      "## Program deployed",
      "Your program is onchain in Surfpool. Now connect the client side to the instructions you just deployed.",
      "## Client & testing",
      clientCopy,
    ].join("\n\n"),
    clientPageIndexes,
  };
};

const section = (title: string, content: string) => {
  const heading = firstHeading(content);
  if (heading?.toLocaleLowerCase() === title.toLocaleLowerCase()) {
    return content;
  }
  return `### ${title}\n\n${content}`;
};

const firstHeading = (content: string) =>
  content.match(/^#{1,4}\s+(.+)$/m)?.[1]?.trim();

const isClientPage = (label: string) =>
  /\b(client|test|testing|interact|interaction|run client|running)\b/i.test(
    label
  );

const splitAtHeading = (content: string, pattern: RegExp) => {
  const lines = content.split("\n");
  const splitIndex = lines.findIndex((line) => {
    const heading = line.match(/^#{1,4}\s+(.+)$/)?.[1];
    return !!heading && pattern.test(heading);
  });
  return splitIndex < 0
    ? [content, ""]
    : [
        lines.slice(0, splitIndex).join("\n"),
        lines.slice(splitIndex).join("\n"),
      ];
};

const normalizeTutorialCopy = (text: string) =>
  text
    .replace(/\bon[- ]chain\b/gi, (match) =>
      match[0] === "O" ? "Onchain" : "onchain"
    )
    .replace(/\bleft sidebar\b/gi, "action bar above the editor")
    .replace(/\bleft panel\b/gi, "action bar above the editor")
    .trim();
