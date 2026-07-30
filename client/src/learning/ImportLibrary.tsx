import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import type { LearningExample } from "./examples";
import type { TutorialData } from "../utils";
import type { ProgramEntry } from "./program-catalog";

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
              Start clean, open a focused example, or learn through a complete
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
              Examples <span>{examples.length + programs.length}</span>
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
              placeholder={`Search ${tab}`}
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

const Backdrop = styled.div<{ $open: boolean }>`
  position: absolute;
  inset: 5.25rem 0 0;
  z-index: 45;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: color-mix(in srgb, var(--page) 76%, transparent);
  backdrop-filter: blur(14px);
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  visibility: ${({ $open }) => ($open ? "visible" : "hidden")};
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition: opacity 160ms ease, visibility 160ms ease;

  @media (max-width: 720px) {
    inset: 4.4rem 0 0;
    padding: 0;
  }
`;

const Library = styled.section`
  width: min(70rem, 100%);
  max-height: min(48rem, 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 1.15rem;
  background: var(--panel);
  box-shadow: 0 32px 110px rgba(0, 0, 0, 0.46);

  @media (max-width: 720px) {
    width: 100%;
    height: 100%;
    max-height: none;
    border-width: 1px 0 0;
    border-radius: 0;
  }
`;

const LibraryHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  padding: 1.25rem 1.35rem 1rem;
  border-bottom: 1px solid var(--line);

  h2 {
    margin: 0.3rem 0 0;
    font-size: 1.45rem;
    letter-spacing: -0.045em;
  }

  p {
    max-width: 44rem;
    margin: 0.45rem 0 0;
    color: var(--muted);
    font-size: 0.75rem;
    line-height: 1.55;
  }
`;

const Kicker = styled.span`
  color: var(--accent);
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.6rem;
  font-weight: 850;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const CloseButton = styled.button`
  width: 2.35rem;
  height: 2.35rem;
  flex: 0 0 auto;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--muted);
  background: var(--panel-soft);
  font: inherit;
  font-size: 1.25rem;
  cursor: pointer;

  &:hover {
    border-color: var(--accent);
    color: var(--ink);
  }
`;

const LibraryControls = styled.div`
  display: grid;
  grid-template-columns: auto minmax(14rem, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 1.35rem;
  border-bottom: 1px solid var(--line);
  background: var(--panel-soft);

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    padding: 0.75rem;
  }
`;

const KindTabs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 0.2rem;
  border: 1px solid var(--line);
  border-radius: 0.65rem;
  background: var(--panel);

  button {
    min-height: 2.25rem;
    padding: 0 0.8rem;
    border: 0;
    border-radius: 0.45rem;
    color: var(--muted);
    background: transparent;
    font: inherit;
    font-size: 0.68rem;
    font-weight: 750;
    cursor: pointer;

    span {
      margin-left: 0.3rem;
      color: var(--accent);
      font-family: "JetBrains Mono", "SFMono-Regular", monospace;
      font-size: 0.58rem;
    }

    &.active {
      color: var(--ink);
      background: var(--hover);
      box-shadow: 0 5px 14px rgba(0, 0, 0, 0.12);
    }
  }
`;

const SearchLabel = styled.label`
  min-width: 0;
  min-height: 2.65rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0 0.8rem;
  border: 1px solid var(--line);
  border-radius: 0.65rem;
  color: var(--muted);
  background: var(--panel);

  input {
    min-width: 0;
    flex: 1;
    border: 0;
    outline: 0;
    color: var(--ink);
    background: transparent;
    font: inherit;
    font-size: 0.72rem;
  }
`;

const SortLabel = styled.label`
  min-height: 2.65rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.7rem;
  border: 1px solid var(--line);
  border-radius: 0.65rem;
  color: var(--muted);
  background: var(--panel);
  font-size: 0.65rem;

  select {
    border: 0;
    outline: 0;
    color: var(--ink);
    background: transparent;
    font: inherit;
    font-size: 0.68rem;
  }
`;

const LibraryBody = styled.div`
  min-height: 0;
  flex: 1;
  padding: 1rem 1.35rem 1.5rem;
  overflow: auto;
`;

const ScratchButton = styled.button`
  width: 100%;
  min-height: 5.4rem;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.9rem;
  margin-bottom: 0.9rem;
  padding: 0.9rem;
  border: 1px solid color-mix(in srgb, var(--accent) 64%, var(--line-strong));
  border-radius: 0.9rem;
  color: var(--ink);
  background: color-mix(in srgb, var(--accent) 11%, var(--panel-soft));
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 150ms ease, transform 150ms ease,
    box-shadow 150ms ease;

  > span {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;

    strong {
      font-size: 0.92rem;
    }

    small {
      color: var(--muted);
      font-size: 0.66rem;
      line-height: 1.45;
    }
  }

  > b {
    color: var(--acid);
    font-size: 0.7rem;
    white-space: nowrap;
  }

  &:hover:not(:disabled) {
    border-color: var(--accent);
    transform: translateY(-2px);
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.14);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.58;
  }

  @media (max-width: 520px) {
    grid-template-columns: auto minmax(0, 1fr);

    > b {
      grid-column: 1 / -1;
      padding-left: 3.9rem;
    }
  }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const LibraryCard = styled.article`
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.9rem;
  min-height: 8.5rem;
  padding: 0.9rem;
  border: 1px solid var(--line);
  border-radius: 0.9rem;
  background: var(--panel-soft);
  transition: border-color 150ms ease, transform 150ms ease,
    box-shadow 150ms ease;

  &:hover {
    border-color: color-mix(in srgb, var(--accent) 58%, var(--line));
    transform: translateY(-2px);
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.13);
  }

  @media (max-width: 520px) {
    grid-template-columns: auto minmax(0, 1fr);

    > button {
      grid-column: 1 / -1;
    }
  }
`;

const CardIndex = styled.span`
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  color: var(--accent);
  background: var(--panel);
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.72rem;
`;

const ProgramThumbnail = styled.div`
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  background: var(--panel);

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
`;

const TutorialThumbnail = styled.div`
  position: relative;
  width: 5rem;
  height: 4rem;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 0.65rem;
  background: var(--hover);

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  span {
    position: absolute;
    right: 0.3rem;
    bottom: 0.3rem;
    padding: 0.18rem 0.3rem;
    border-radius: 0.3rem;
    color: #fff;
    background: rgba(3, 7, 17, 0.8);
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
    font-size: 0.48rem;
  }
`;

const CardCopy = styled.div`
  min-width: 0;

  h3 {
    margin: 0.25rem 0 0;
    font-size: 0.9rem;
    letter-spacing: -0.025em;
  }

  p {
    display: -webkit-box;
    margin: 0.35rem 0 0;
    overflow: hidden;
    color: var(--muted);
    font-size: 0.66rem;
    line-height: 1.45;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.55rem;

  span {
    padding: 0.2rem 0.38rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--muted);
    background: var(--panel);
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
    font-size: 0.48rem;
  }
`;

const ImportButton = styled.button`
  min-width: 4.5rem;
  min-height: 2.35rem;
  padding: 0 0.75rem;
  border: 0;
  border-radius: 0.58rem;
  color: #07130d;
  background: var(--acid);
  font: inherit;
  font-size: 0.65rem;
  font-weight: 850;
  cursor: pointer;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 18px color-mix(in srgb, var(--acid) 24%, transparent);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.55;
  }
`;

const EmptyState = styled.div`
  min-height: 18rem;
  display: grid;
  place-content: center;
  justify-items: center;
  color: var(--muted);
  text-align: center;

  > span {
    font-size: 1.6rem;
  }

  strong {
    margin-top: 0.65rem;
    color: var(--ink);
  }

  p {
    margin: 0.3rem 0 0;
    font-size: 0.7rem;
  }
`;

export default ImportLibrary;
