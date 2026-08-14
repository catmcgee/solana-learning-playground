import styled from "styled-components";

export const Backdrop = styled.div<{ $open: boolean }>`
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

export const Library = styled.section`
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

export const LibraryHeader = styled.header`
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

export const Kicker = styled.span`
  color: var(--accent);
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.6rem;
  font-weight: 850;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

export const CloseButton = styled.button`
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

export const LibraryControls = styled.div`
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

export const KindTabs = styled.div`
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

export const SearchLabel = styled.label`
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

export const SortLabel = styled.label`
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

export const LibraryBody = styled.div`
  min-height: 0;
  flex: 1;
  padding: 1rem 1.35rem 1.5rem;
  overflow: auto;
`;

export const ScratchButton = styled.button`
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

export const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const LibraryCard = styled.article`
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

export const CardIndex = styled.span`
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

export const ProgramThumbnail = styled.div`
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

export const TutorialThumbnail = styled.div`
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

export const CardCopy = styled.div`
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

export const TagRow = styled.div`
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

export const ImportButton = styled.button`
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

export const EmptyState = styled.div`
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
