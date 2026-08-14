import { useEffect, useMemo, useState } from "react";

import type { LearningExample } from "./examples";
import type { TutorialData } from "../utils";
import type { ProgramEntry } from "./program-catalog";
import {
  Backdrop,
  CardCopy,
  CardGrid,
  CardIndex,
  CloseButton,
  EmptyState,
  ImportButton,
  Kicker,
  KindTabs,
  Library,
  LibraryBody,
  LibraryCard,
  LibraryControls,
  LibraryHeader,
  ProgramThumbnail,
  ScratchButton,
  SearchLabel,
  SortLabel,
  TagRow,
  TutorialThumbnail,
} from "./ImportLibrary.styles";

export type LearningLibraryTab = "examples" | "tutorials";

type ImportLibraryProps = {
  examples: LearningExample[];
  importedExampleIds: string[];
  importedProgramRepos: string[];
  importedTutorialNames: string[];
  initialTab: LearningLibraryTab;
  onClose: () => void;
  onImportExample: (example: LearningExample) => Promise<void>;
  onImportProgram: (program: ProgramEntry) => Promise<void>;
  onImportTutorial: (tutorial: TutorialData) => Promise<void>;
  onStartFromScratch: () => Promise<void>;
  open: boolean;
  programs: ProgramEntry[];
  tutorials: TutorialData[];
};

const ImportLibrary = ({
  examples,
  importedExampleIds,
  importedProgramRepos,
  importedTutorialNames,
  initialTab,
  onClose,
  onImportExample,
  onImportProgram,
  onImportTutorial,
  onStartFromScratch,
  open,
  programs,
  tutorials,
}: ImportLibraryProps) => {
  const [tab, setTab] = useState<LearningLibraryTab>(initialTab);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"featured" | "name" | "level">("featured");
  const [importing, setImporting] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [initialTab, onClose, open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredExamples = useMemo(
    () =>
      examples.filter(
        (example) =>
          !normalizedQuery ||
          `${example.title} ${example.description} ${example.concepts.join(
            " "
          )}`
            .toLowerCase()
            .includes(normalizedQuery)
      ),
    [examples, normalizedQuery]
  );
  const filteredTutorials = useMemo(() => {
    const values = tutorials.filter(
      (tutorial) =>
        !normalizedQuery ||
        `${tutorial.name} ${tutorial.description} ${tutorial.level} ${
          tutorial.framework ?? ""
        } ${(tutorial.categories ?? []).join(" ")}`
          .toLowerCase()
          .includes(normalizedQuery)
    );
    return values.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "level") {
        const levelOrder = ["Beginner", "Intermediate", "Advanced"];
        return (
          levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level) ||
          a.name.localeCompare(b.name)
        );
      }
      const featuredOrder = Number(!!b.featured) - Number(!!a.featured);
      if (featuredOrder) return featuredOrder;
      if (a.unixTimestamp !== b.unixTimestamp) {
        return b.unixTimestamp - a.unixTimestamp;
      }
      return a.name.localeCompare(b.name);
    });
  }, [normalizedQuery, sort, tutorials]);
  const filteredPrograms = useMemo(
    () =>
      programs
        .filter(
          (program) =>
            !normalizedQuery ||
            `${program.name} ${program.description} ${
              program.framework
            } ${program.categories.join(" ")}`
              .toLowerCase()
              .includes(normalizedQuery)
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [normalizedQuery, programs]
  );

  const importExample = async (example: LearningExample) => {
    setImporting(`example:${example.id}`);
    try {
      await onImportExample(example);
    } finally {
      setImporting(undefined);
    }
  };

  const importTutorial = async (tutorial: TutorialData) => {
    setImporting(`tutorial:${tutorial.name}`);
    try {
      await onImportTutorial(tutorial);
    } finally {
      setImporting(undefined);
    }
  };

  const importProgram = async (program: ProgramEntry) => {
    setImporting(`program:${program.repo}`);
    try {
      await onImportProgram(program);
    } finally {
      setImporting(undefined);
    }
  };

  const startFromScratch = async () => {
    setImporting("scratch");
    try {
      await onStartFromScratch();
    } finally {
      setImporting(undefined);
    }
  };

  return (
    <Backdrop $open={open} aria-hidden={!open} onMouseDown={onClose}>
      <Library
        role="dialog"
        aria-modal="true"
        aria-label="Create or open a learning workspace"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <LibraryHeader>
          <div>
            <Kicker>New workspace</Kicker>
            <h2>What do you want to build?</h2>
            <p>
              Start clean, open a focused program, or learn through a complete
              tutorial. Your choices and every code change stay in this browser.
            </p>
          </div>
          <CloseButton
            type="button"
            onClick={onClose}
            aria-label="Close new workspace picker"
          >
            ×
          </CloseButton>
        </LibraryHeader>

        <LibraryControls>
          <KindTabs role="tablist" aria-label="Library type">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "examples"}
              className={tab === "examples" ? "active" : undefined}
              onClick={() => setTab("examples")}
            >
              Programs <span>{examples.length + programs.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "tutorials"}
              className={tab === "tutorials" ? "active" : undefined}
              onClick={() => setTab("tutorials")}
            >
              Tutorials <span>{tutorials.length}</span>
            </button>
          </KindTabs>
          <SearchLabel>
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                tab === "tutorials" ? "Search tutorials" : "Search programs"
              }
              autoFocus={open}
            />
          </SearchLabel>
          {tab === "tutorials" && (
            <SortLabel>
              <span>Sort</span>
              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as "featured" | "name" | "level")
                }
              >
                <option value="featured">Featured</option>
                <option value="name">Name</option>
                <option value="level">Level</option>
              </select>
            </SortLabel>
          )}
        </LibraryControls>

        <LibraryBody>
          <ScratchButton
            type="button"
            disabled={!!importing}
            onClick={() => void startFromScratch()}
          >
            <CardIndex>＋</CardIndex>
            <span>
              <Kicker>Blank canvas</Kicker>
              <strong>Start from scratch</strong>
              <small>
                Open a working Solana starter and shape it with Program Pal.
              </small>
            </span>
            <b>{importing === "scratch" ? "Opening…" : "Start →"}</b>
          </ScratchButton>

          {tab === "examples" ? (
            <CardGrid>
              {filteredExamples.map((example) => {
                const imported = importedExampleIds.includes(example.id);
                const busy = importing === `example:${example.id}`;
                return (
                  <LibraryCard key={example.id}>
                    <CardIndex>
                      {String(example.order).padStart(2, "0")}
                    </CardIndex>
                    <CardCopy>
                      <Kicker>{example.eyebrow}</Kicker>
                      <h3>{example.title}</h3>
                      <p>{example.description}</p>
                      <TagRow>
                        {example.concepts.map((concept) => (
                          <span key={concept}>{concept}</span>
                        ))}
                      </TagRow>
                    </CardCopy>
                    <ImportButton
                      type="button"
                      disabled={!!importing}
                      onClick={() => void importExample(example)}
                    >
                      {busy ? "Opening…" : imported ? "Open" : "Add"}
                    </ImportButton>
                  </LibraryCard>
                );
              })}
              {filteredPrograms.map((program) => {
                const imported = importedProgramRepos.includes(program.repo);
                const busy = importing === `program:${program.repo}`;
                return (
                  <LibraryCard key={program.repo}>
                    <ProgramThumbnail>
                      <img src={program.icon} alt="" />
                    </ProgramThumbnail>
                    <CardCopy>
                      <Kicker>{program.framework} · Program</Kicker>
                      <h3>{program.name}</h3>
                      <p>{program.description}</p>
                      <TagRow>
                        {program.categories.map((category) => (
                          <span key={category}>{category}</span>
                        ))}
                      </TagRow>
                    </CardCopy>
                    <ImportButton
                      type="button"
                      disabled={!!importing}
                      onClick={() => void importProgram(program)}
                    >
                      {busy ? "Adding…" : imported ? "Open" : "Add"}
                    </ImportButton>
                  </LibraryCard>
                );
              })}
            </CardGrid>
          ) : (
            <CardGrid>
              {filteredTutorials.map((tutorial) => {
                const imported = importedTutorialNames.includes(tutorial.name);
                const busy = importing === `tutorial:${tutorial.name}`;
                return (
                  <LibraryCard key={tutorial.name}>
                    <TutorialThumbnail>
                      <img src={tutorial.thumbnail} alt="" />
                      <span>{tutorial.pageCount} parts</span>
                    </TutorialThumbnail>
                    <CardCopy>
                      <Kicker>
                        {tutorial.level}
                        {tutorial.framework ? ` · ${tutorial.framework}` : ""}
                      </Kicker>
                      <h3>{tutorial.name}</h3>
                      <p>{tutorial.description}</p>
                      <TagRow>
                        {(tutorial.categories ?? []).map((category) => (
                          <span key={category}>{category}</span>
                        ))}
                      </TagRow>
                    </CardCopy>
                    <ImportButton
                      type="button"
                      disabled={!!importing}
                      onClick={() => void importTutorial(tutorial)}
                    >
                      {busy ? "Adding…" : imported ? "Open" : "Add"}
                    </ImportButton>
                  </LibraryCard>
                );
              })}
            </CardGrid>
          )}

          {(tab === "examples"
            ? filteredExamples.length + filteredPrograms.length === 0
            : filteredTutorials.length === 0) && (
            <EmptyState>
              <span>⌕</span>
              <strong>No matches</strong>
              <p>Try a shorter search.</p>
            </EmptyState>
          )}
        </LibraryBody>
      </Library>
    </Backdrop>
  );
};

export default ImportLibrary;
