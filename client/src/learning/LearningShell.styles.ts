import styled, { createGlobalStyle, css, keyframes } from "styled-components";

import type { LearningEvent, TutorMessage } from "./types";

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const reveal = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slidePanel = keyframes`
  from { opacity: 0; transform: translateX(2rem); }
  to { opacity: 1; transform: translateX(0); }
`;

export const LearningGlobals = createGlobalStyle<{ $mode: "light" | "dark" }>`
  body {
    background: ${({ $mode }) => ($mode === "dark" ? "#030711" : "#f8fafc")};
  }

  * {
    box-sizing: border-box;
  }
`;

export const Shell = styled.div`
  --ink: #f7f7fb;
  --muted: #8b94a7;
  --line: #1f2939;
  --line-strong: #314057;
  --page: #030711;
  --header: rgba(3, 7, 17, 0.9);
  --panel: #070d19;
  --panel-raised: #101322;
  --panel-soft: #0b111e;
  --hover: #111a2a;
  --editor: #050b17;
  --disabled: #121827;
  --disabled-ink: #657086;
  --accent: #8b5cf6;
  --acid: #4bf293;
  --orange: #ff69a6;
  --aqua: #25d9e8;
  --pink: #ff4f91;
  --error: #ff5d73;
  --gradient: linear-gradient(115deg, #8b3dff 0%, #7c52ff 52%, #20c9e7 100%);
  --lesson-gradient: linear-gradient(
    112deg,
    rgba(11, 31, 47, 0.96) 0%,
    rgba(10, 75, 68, 0.96) 68%,
    rgba(35, 231, 170, 0.58) 100%
  );
  --callout-surface: #141b2a;
  --callout-kicker: #8fffd0;
  --callout-muted: #d6dbea;
  --callout-action: #55f3a1;
  --callout-action-ink: #07130d;
  --shadow: 0 18px 50px rgba(0, 0, 0, 0.22);

  &[data-theme="light"] {
    --ink: #121620;
    --muted: #687286;
    --line: #e1e6ef;
    --line-strong: #cbd3df;
    --page: #fafbfe;
    --header: rgba(250, 251, 254, 0.9);
    --panel: #ffffff;
    --panel-raised: #f5f2ff;
    --panel-soft: #f8fafc;
    --hover: #f2f5f9;
    --editor: #ffffff;
    --disabled: #f2f4f7;
    --disabled-ink: #a3aab7;
    --accent: #8757f5;
    --acid: #28c769;
    --orange: #aa45eb;
    --aqua: #16b8c7;
    --pink: #ec4b91;
    --error: #d92d4b;
    --gradient: linear-gradient(115deg, #7357f7 0%, #9d45e8 100%);
    --lesson-gradient: linear-gradient(
      112deg,
      #82ecc5 0%,
      #b5f07e 48%,
      #ffe769 100%
    );
    --callout-surface: #f1eff8;
    --callout-kicker: #551ba7;
    --callout-muted: #553f63;
    --callout-action: #5625a8;
    --callout-action-ink: #ffffff;
    --shadow: 0 12px 32px rgba(24, 35, 55, 0.08);
  }

  position: fixed;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--ink);
  background: radial-gradient(
      circle at 55% -12%,
      rgba(105, 80, 244, 0.08),
      transparent 34rem
    ),
    var(--page);
  font-family: Inter, "SF Pro Display", -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
  transition: color 180ms ease, background 180ms ease;
`;

export const Header = styled.header`
  min-height: 5.25rem;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 0 1.8rem;
  background: var(--header);
  backdrop-filter: blur(18px);

  @media (max-width: 720px) {
    min-height: 4.4rem;
    gap: 0.55rem;
    padding: 0 0.7rem;
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
`;

export const BrandMark = styled.div`
  width: 2.2rem;
  height: 2.2rem;
  position: relative;
  transform: rotate(-8deg);

  span {
    position: absolute;
    left: 0.15rem;
    width: 1.9rem;
    height: 0.42rem;
    border-radius: 1rem;
    background: var(--acid);

    &:nth-child(1) {
      top: 0.25rem;
      transform: translateX(-0.16rem);
    }
    &:nth-child(2) {
      top: 0.88rem;
      background: var(--aqua);
    }
    &:nth-child(3) {
      top: 1.5rem;
      transform: translateX(0.16rem);
      background: var(--pink);
    }
  }
`;

export const BrandCopy = styled.div`
  display: flex;
  flex-direction: column;
  line-height: 1.05;

  strong {
    font-size: 1.18rem;
    font-weight: 750;
    letter-spacing: -0.035em;
  }

  @media (max-width: 720px) {
    display: none;
  }
`;

export const HeaderActions = styled.div`
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 0.65rem;
`;

export const NetworkControl = styled.div`
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 0.4rem;
`;

export const RpcSettingsButton = styled.button`
  min-width: 2.8rem;
  padding: 0 0.65rem;
  border: 1px solid var(--line);
  border-radius: 0.7rem;
  color: var(--muted);
  background: var(--panel);
  font: 800 0.58rem "JetBrains Mono", "SFMono-Regular", monospace;
  letter-spacing: 0.08em;
  cursor: pointer;

  &:hover,
  &[aria-expanded="true"] {
    border-color: var(--accent);
    color: var(--accent);
  }
`;

export const RpcPopover = styled.form`
  position: absolute;
  top: calc(100% + 0.65rem);
  right: 0;
  z-index: 70;
  width: min(25rem, calc(100vw - 1.4rem));
  padding: 1rem;
  border: 1px solid var(--line-strong);
  border-radius: 0.9rem;
  color: var(--ink);
  background: var(--panel);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);

  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;

    button {
      width: 1.8rem;
      height: 1.8rem;
      border: 0;
      border-radius: 50%;
      color: var(--muted);
      background: var(--panel-soft);
      font: inherit;
      cursor: pointer;
    }
  }

  > strong {
    display: block;
    margin-top: 0.45rem;
    font-size: 0.95rem;
  }

  > p {
    margin: 0.3rem 0 0.8rem;
    color: var(--muted);
    font-size: 0.66rem;
    line-height: 1.5;
  }

  > label {
    display: grid;
    gap: 0.35rem;

    span {
      color: var(--muted);
      font: 750 0.56rem "JetBrains Mono", "SFMono-Regular", monospace;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    input {
      min-width: 0;
      height: 2.65rem;
      padding: 0 0.7rem;
      border: 1px solid var(--line);
      border-radius: 0.6rem;
      outline: 0;
      color: var(--ink);
      background: var(--panel-soft);
      font: 0.67rem "JetBrains Mono", "SFMono-Regular", monospace;

      &:focus {
        border-color: var(--accent);
      }
    }
  }

  > small {
    display: block;
    margin-top: 0.5rem;
    color: var(--error);
    font-size: 0.62rem;
    line-height: 1.4;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.8rem;

    button {
      min-height: 2.35rem;
      padding: 0 0.75rem;
      border: 1px solid var(--line);
      border-radius: 0.55rem;
      color: var(--ink);
      background: var(--panel-soft);
      font: inherit;
      font-size: 0.63rem;
      font-weight: 800;
      cursor: pointer;

      &[type="submit"] {
        border-color: transparent;
        color: #07130d;
        background: var(--acid);
      }

      &:disabled {
        cursor: wait;
        opacity: 0.55;
      }
    }
  }
`;

export const ConnectedStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.55rem;
  max-width: min(42rem, 62vw);
  padding: 0.65rem 0.9rem;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  color: var(--muted);
  background: var(--panel);
  box-shadow: var(--shadow);
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.63rem;

  a {
    color: var(--acid);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover {
      text-decoration: underline;
      text-underline-offset: 0.2rem;
    }
  }

  @media (max-width: 720px) {
    max-width: 7.5rem;
    padding: 0.55rem 0.65rem;

    > span {
      display: none;
    }
  }
`;

export const ThemeToggle = styled.button`
  width: 2.55rem;
  height: 2.55rem;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  background: var(--panel);
  color: var(--ink);
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: 150ms ease;

  span {
    font-size: 1rem;
    line-height: 1;
  }

  &:hover {
    border-color: var(--accent);
    color: var(--accent);
    transform: translateY(-1px);
  }
`;

export const PrimaryButton = styled.button`
  border: 0;
  border-radius: 0.65rem;
  padding: 0.68rem 0.9rem;
  background: var(--gradient);
  color: #ffffff;
  font: inherit;
  font-size: 0.68rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(126, 71, 244, 0.2);

  &:hover:not(:disabled) {
    transform: translate(-1px, -1px);
  }
  &:disabled {
    cursor: wait;
    opacity: 0.55;
  }
`;

export const MobileTabs = styled.nav`
  display: none;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid var(--line);

  button {
    padding: 0.75rem;
    border: 0;
    border-right: 1px solid var(--line);
    background: var(--panel);
    color: var(--muted);
    font: inherit;
    font-size: 0.66rem;
    text-transform: uppercase;

    &.active {
      color: var(--accent);
      box-shadow: inset 0 -2px var(--accent);
    }
  }

  @media (max-width: 1100px) {
    display: grid;
  }
`;

export const Body = styled.main<{ $tutorWidth: number }>`
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns:
    clamp(12rem, 18vw, 19rem)
    minmax(18rem, 1fr)
    ${({ $tutorWidth }) => $tutorWidth}px;
  gap: 1rem;
  padding: 0 1.25rem 1rem;
  overflow: hidden;

  @media (max-width: 1280px) {
    gap: 0.7rem;
  }

  @media (max-width: 1100px) {
    display: block;
    padding: 0;
  }
`;

const panelVisibility = css<{ visible: boolean }>`
  @media (max-width: 1100px) {
    ${({ visible }) => !visible && "display: none !important;"}
    width: 100%;
    height: 100%;
  }
`;

export const LessonRail = styled.aside<{ visible: boolean }>`
  ${panelVisibility};
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 1rem;
  background: var(--panel);
  box-shadow: var(--shadow);
`;

export const Kicker = styled.span`
  color: var(--accent);
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

export const ChapterList = styled.div`
  min-height: 0;
  flex: 1;
  padding: 1.15rem 0.95rem;
  overflow: auto;
`;

export const LearningKindTabs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: 0 0 auto;
  padding: 0.7rem 0.75rem 0;
  border-bottom: 1px solid var(--line);

  button {
    min-width: 0;
    min-height: 2.7rem;
    padding: 0 0.45rem;
    border: 0;
    border-bottom: 2px solid transparent;
    color: var(--muted);
    background: transparent;
    font: inherit;
    font-size: 0.68rem;
    font-weight: 780;
    cursor: pointer;

    span {
      display: inline-grid;
      min-width: 1.15rem;
      height: 1.15rem;
      place-items: center;
      margin-left: 0.3rem;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--accent);
      font-family: "JetBrains Mono", "SFMono-Regular", monospace;
      font-size: 0.5rem;
    }

    &:hover,
    &.active {
      color: var(--ink);
    }

    &.active {
      border-bottom-color: var(--accent);
    }
  }
`;

export const SidebarEmpty = styled.div`
  min-height: 13rem;
  display: grid;
  place-content: center;
  justify-items: center;
  padding: 1.5rem 0.75rem;
  color: var(--muted);
  text-align: center;

  > span {
    color: var(--accent);
    font-size: 1.15rem;
  }

  strong {
    margin-top: 0.65rem;
    color: var(--ink);
    font-size: 0.76rem;
  }

  p {
    margin: 0.35rem 0 0;
    font-size: 0.64rem;
    line-height: 1.5;
  }
`;

export const ImportShelf = styled.div`
  flex: 0 0 auto;
  padding: 0.75rem;
  border-top: 1px solid var(--line);
  background: var(--panel-soft);

  > button {
    width: 100%;
    min-height: 3.7rem;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.7rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.75rem;
    color: var(--ink);
    background: var(--panel);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: 150ms ease;

    > span {
      width: 2rem;
      height: 2rem;
      display: grid;
      place-items: center;
      border: 1px solid var(--accent);
      border-radius: 50%;
      color: var(--accent);
      font-size: 1rem;
    }

    strong {
      font-size: 0.75rem;
    }

    b {
      color: var(--accent);
      font-size: 0.9rem;
    }

    &:hover {
      border-color: var(--accent);
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
    }
  }
`;

export const ChapterButton = styled.button<{ active: boolean }>`
  width: 100%;
  display: grid;
  grid-template-columns: 2.8rem 1fr auto;
  align-items: center;
  gap: 0.78rem;
  min-height: 5rem;
  padding: 0.9rem 0.9rem;
  border: 1px solid transparent;
  border-radius: 0.85rem;
  background: ${({ active }) =>
    active ? "var(--lesson-gradient)" : "transparent"};
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition: 160ms ease;

  & + & {
    margin-top: 0.42rem;
  }
  &:hover {
    background: ${({ active }) =>
      active ? "var(--lesson-gradient)" : "var(--hover)"};
    border-color: ${({ active }) => (active ? "transparent" : "var(--line)")};
    transform: translateY(-1px);
  }

  ${({ active }) =>
    active &&
    css`
      box-shadow: inset 0 0 0 1px rgba(64, 244, 180, 0.25),
        0 12px 30px rgba(32, 217, 176, 0.12);

      &::after {
        content: "→";
        justify-self: end;
        color: var(--acid);
        font-size: 1.1rem;
      }
    `}

  > span:last-child {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.18rem;

    small {
      color: ${({ active }) => (active ? "var(--ink)" : "var(--muted)")};
      font-size: 0.6rem;
      text-transform: uppercase;
      white-space: nowrap;
      opacity: ${({ active }) => (active ? 0.74 : 1)};
    }

    strong {
      font-size: 0.82rem;
      letter-spacing: -0.015em;
    }
  }
`;

export const ChapterNumber = styled.span`
  width: 2.65rem;
  height: 2.65rem;
  display: grid;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.72rem;
`;

export const CustomProgramNumber = styled(ChapterNumber)`
  border-color: #a78bfa;
  color: #fff;
  background: #7c3aed;
  box-shadow: 0 0 0 0.24rem color-mix(in srgb, #8b5cf6 16%, transparent);
`;

export const CustomProgramCopy = styled.span`
  min-width: 0;

  small {
    color: #a78bfa !important;
    font-weight: 850;
    letter-spacing: 0.08em;
  }

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const Workbench = styled.section<{
  visible: boolean;
  $timelineHeight: number;
  $showExperiment: boolean;
}>`
  ${panelVisibility};
  position: relative;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: ${({ $timelineHeight, $showExperiment }) =>
    $showExperiment
      ? `auto minmax(14rem, 1fr) auto ${$timelineHeight}px`
      : `auto minmax(14rem, 1fr) ${$timelineHeight}px`};
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 1rem;
  background: var(--panel);
  box-shadow: var(--shadow);
`;

export const InlineInteractionDrawer = styled.aside`
  position: absolute;
  inset: 0 0 0 auto;
  z-index: 12;
  width: min(35rem, 92%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--panel);
  box-shadow: -24px 0 60px rgba(0, 0, 0, 0.34);
  animation: ${slidePanel} 220ms ease both;

  @media (max-width: 720px) {
    width: 100%;
  }
`;

export const LearningWalletPanel = styled.aside`
  position: absolute;
  z-index: 11;
  top: 5rem;
  right: 1rem;
  width: min(22rem, calc(100% - 2rem));
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 0.9rem;
  background: var(--panel-raised);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.42);
  animation: ${reveal} 180ms ease both;
`;

export const LearningWalletHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1rem 0.8rem;
  border-bottom: 1px solid var(--line);

  h3 {
    margin: 0;
    font-size: 1rem;
    letter-spacing: -0.025em;
  }

  > button {
    width: 1.75rem;
    height: 1.75rem;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--hover);
    color: var(--muted);
    font: inherit;
    font-size: 1.05rem;
    cursor: pointer;

    &:hover {
      color: var(--ink);
      background: color-mix(in srgb, var(--muted) 20%, transparent);
    }
  }
`;

export const LearningWalletBalance = styled.div`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-bottom: 1px solid var(--line);

  span,
  small {
    color: var(--muted);
    font-size: 0.64rem;
  }

  strong {
    margin: 0.25rem 0 0.12rem;
    color: var(--acid);
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
    font-size: 1.45rem;
    letter-spacing: -0.04em;
  }
`;

export const LearningWalletAddress = styled.div`
  padding: 0.9rem 1rem;

  > span {
    color: var(--muted);
    font-size: 0.64rem;
  }

  code {
    display: block;
    margin: 0.42rem 0 0.7rem;
    padding: 0.62rem 0.7rem;
    overflow: hidden;
    border-radius: 0.5rem;
    color: var(--ink);
    background: var(--editor);
    font: 0.65rem/1.45 "JetBrains Mono", "SFMono-Regular", monospace;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  div {
    display: flex;
    gap: 0.5rem;
  }

  button,
  a {
    flex: 1;
    min-height: 2.15rem;
    display: grid;
    place-items: center;
    padding: 0.5rem 0.65rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.5rem;
    background: var(--panel);
    color: var(--ink);
    font: inherit;
    font-size: 0.64rem;
    font-weight: 750;
    text-align: center;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
  }
`;

export const LearningWalletNote = styled.p`
  margin: 0;
  padding: 0.78rem 1rem 0.9rem;
  border-top: 1px solid var(--line);
  color: var(--muted);
  background: var(--panel-soft);
  font-size: 0.62rem;
  line-height: 1.5;
`;

export const InteractionDrawerHeader = styled.header`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  padding: 1.2rem 1.25rem 1rem;
  border-bottom: 1px solid var(--line);
  background: var(--panel-raised);

  h3 {
    margin: 0.35rem 0 0.25rem;
    font-size: 1.25rem;
    letter-spacing: -0.025em;
  }

  p {
    max-width: 30rem;
    margin: 0;
    color: var(--muted);
    font-size: 0.76rem;
    line-height: 1.55;
  }

  > button {
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: 50%;
    background: var(--hover);
    color: var(--ink);
    font: inherit;
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;

    &:hover {
      background: var(--accent);
      color: #ffffff;
    }
  }
`;

export const InteractionMeta = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--line);
  font-size: 0.68rem;

  span {
    color: var(--muted);
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const InteractionTestBar = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  margin: 0.9rem 1rem 0;
  padding: 0.9rem 1rem;
  border-radius: 0.75rem;
  background: var(--callout-surface);

  > div {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.18rem;

    strong {
      color: var(--ink);
      font-size: 0.78rem;
    }

    > span:last-child {
      color: var(--muted);
      font-size: 0.65rem;
      line-height: 1.45;
    }
  }

  > button {
    min-height: 2.45rem;
    padding: 0 0.85rem;
    border: 0;
    border-radius: 0.55rem;
    color: var(--callout-action-ink);
    background: var(--callout-action);
    font: inherit;
    font-size: 0.68rem;
    font-weight: 850;
    cursor: pointer;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    &:disabled {
      cursor: wait;
      opacity: 0.55;
    }
  }

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const InteractionReceipt = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.18rem 0.75rem;
  margin: 0.85rem 1rem 0;
  padding: 0.8rem 0.9rem;
  border-radius: 0.65rem;
  background: rgba(75, 242, 147, 0.1);

  span {
    grid-column: 1 / -1;
    color: var(--acid);
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  strong {
    font-size: 0.76rem;
  }

  a {
    color: var(--acid);
    font-size: 0.68rem;
    font-weight: 750;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export const InlineInstructionList = styled.div`
  flex: 1;
  overflow: auto;
  padding: 0.8rem 0;

  > div {
    border-color: var(--line);
  }
`;

export const InteractionDrawerFooter = styled.footer`
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--line);
  color: var(--muted);
  background: var(--panel-soft);
  font-size: 0.68rem;
  line-height: 1.45;
`;

export const WorkbenchTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--line);

  @media (max-width: 1100px) {
    display: grid;
    align-items: stretch;
    gap: 0.75rem;
  }
`;

export const LessonHeading = styled.div`
  span {
    color: var(--accent);
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
    font-size: 0.66rem;
    font-weight: bold;
    letter-spacing: 0.12em;
  }

  h2 {
    margin: 0.28rem 0 0;
    font-size: 1.55rem;
    font-weight: 720;
    letter-spacing: -0.04em;
  }
`;

export const ActionStrip = styled.div`
  display: flex;
  gap: 0.55rem;

  @media (max-width: 1100px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));

    > button,
    > span,
    > span > button {
      width: 100%;
    }

    button {
      justify-content: center;
    }
  }
`;

export const ActionHint = styled.span`
  display: inline-flex;
`;

export const ActionButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.42rem;
  min-height: 2.65rem;
  padding: 0.58rem 0.82rem;
  border: 1px solid var(--line);
  border-radius: 0.65rem;
  background: var(--panel);
  color: var(--ink);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 650;
  cursor: pointer;
  transition: 150ms ease;

  span {
    color: var(--accent);
  }
  &:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }

  &:disabled {
    border-color: var(--line);
    background: var(--disabled);
    color: var(--disabled-ink);
    cursor: not-allowed;
    transform: none;

    span {
      color: var(--disabled-ink);
    }
  }

  ${({ $active }) =>
    $active &&
    css`
      border-color: transparent;
      background: var(--gradient);
      color: #ffffff;
      box-shadow: 0 8px 20px rgba(126, 71, 244, 0.2);

      span {
        color: #ffffff;
      }
    `}
`;

export const EditorFrame = styled.div<{ ready: boolean }>`
  min-height: 0;
  position: relative;
  border-bottom: 1px solid var(--line);
  background: var(--editor);

  ${({ ready }) =>
    ready &&
    css`
      animation: ${reveal} 260ms ease both;
    `}
`;

export const EditorLoading = styled.div`
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 0.68rem;
`;

export const Experiment = styled.div`
  position: relative;
  width: calc(100% - 2rem);
  min-width: 0;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.8rem;
  margin: 0.7rem 1rem;
  padding: 0.82rem 3.25rem 0.82rem 1rem;
  border: 0;
  border-radius: 0.8rem;
  background: var(--callout-surface);

  > div:nth-child(2) {
    min-width: 0;
  }

  > div:nth-child(2) > ${Kicker} {
    color: var(--callout-kicker);
  }

  strong {
    display: block;
    margin-top: 0.18rem;
    font-size: 0.84rem;
  }

  p {
    margin: 0.25rem 0 0;
    color: var(--callout-muted);
    font-size: 0.66rem;
    line-height: 1.45;
  }

  @media (max-width: 560px) {
    grid-template-columns: auto 1fr;

    > .experiment-action {
      grid-column: 1 / -1;
    }
  }
`;

export const ExperimentIcon = styled.div`
  width: 2.2rem;
  height: 2.2rem;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: var(--acid);
  background: color-mix(in srgb, var(--acid) 12%, transparent);
`;

export const DoItButton = styled.button`
  border: 0;
  border-radius: 0.55rem;
  padding: 0.55rem 0.72rem;
  background: var(--callout-action);
  color: var(--callout-action-ink);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 150ms ease, box-shadow 150ms ease;

  span {
    margin-left: 0.3rem;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 7px 16px rgba(22, 12, 52, 0.2);
  }
`;

export const ExperimentDismissButton = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.55rem;
  width: 1.55rem;
  height: 1.55rem;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--muted) 14%, transparent);
  color: var(--muted);
  font: inherit;
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
  transition: 140ms ease;

  &:hover,
  &:focus-visible {
    background: color-mix(in srgb, var(--muted) 24%, transparent);
    color: var(--ink);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;

export const Timeline = styled.div`
  position: relative;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--line);
  background: var(--panel);
`;

export const TimelineResizeHandle = styled.button`
  position: absolute;
  z-index: 5;
  top: -0.5rem;
  left: 0;
  width: 100%;
  height: 1rem;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: row-resize;
  touch-action: none;

  &::after {
    content: "";
    position: absolute;
    top: calc(50% - 1px);
    left: 50%;
    width: 3.5rem;
    height: 2px;
    border-radius: 999px;
    background: var(--line-strong);
    opacity: 0.72;
    transform: translateX(-50%);
    transition: width 150ms ease, background 150ms ease, opacity 150ms ease;
  }

  &:hover::after,
  &:focus-visible::after {
    width: 5rem;
    background: var(--accent);
    opacity: 1;
  }

  &:focus-visible {
    outline: none;
  }
`;

export const TimelineHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.55rem 0.8rem;
  border-bottom: 1px solid var(--line);
  font-size: 0.64rem;
  letter-spacing: 0.1em;

  > button {
    border: 0;
    background: none;
    color: var(--muted);
    font: inherit;
    font-size: 0.64rem;
    cursor: pointer;
    &:disabled {
      opacity: 0.35;
    }
  }
`;

export const TimelineTabs = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

export const TimelineTab = styled.button<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid
    ${({ active }) => (active ? "var(--line-strong)" : "transparent")};
  border-radius: 0.4rem 0.4rem 0 0;
  background: ${({ active }) => (active ? "var(--panel-soft)" : "transparent")};
  color: ${({ active }) => (active ? "var(--ink)" : "var(--muted)")};
  font: inherit;
  font-size: 0.64rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;

  &:hover {
    color: var(--ink);
  }
`;

export const EventList = styled.div`
  overflow: auto;
`;

export const EventRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: 0.65rem;
  padding: 0.58rem 0.8rem;
  border-bottom: 1px solid var(--line);

  time {
    color: var(--muted);
    font-size: 0.6rem;
  }
`;

export const EventCopy = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;

  strong {
    font-size: 0.72rem;
  }
  span {
    color: var(--muted);
    font-size: 0.64rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export const EventExplorerLink = styled.a`
  width: fit-content;
  margin-top: 0.28rem;
  color: var(--accent);
  font-size: 0.64rem;
  font-weight: 750;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

export const NoteActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.4rem;

  button {
    padding: 0.32rem 0.55rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.4rem;
    background: var(--panel-soft);
    color: var(--ink);
    font: inherit;
    font-size: 0.62rem;
    font-weight: 700;
    cursor: pointer;

    &:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }
`;

export const EventGlyph = styled.span<{ status: LearningEvent["status"] }>`
  color: ${({ status }) => {
    switch (status) {
      case "error":
        return "var(--error)";
      case "success":
        return "var(--acid)";
      default:
        return "var(--aqua)";
    }
  }};
  font-size: 0.8rem;
`;

export const WorkingSpinner = styled.span`
  width: 0.72rem;
  height: 0.72rem;
  margin-top: 0.08rem;
  border: 1px solid #3e5149;
  border-top-color: var(--aqua);
  border-radius: 50%;
  animation: ${spin} 700ms linear infinite;
`;

export const VerboseLog = styled.pre`
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0.7rem 0.8rem;
  overflow: auto;
  color: var(--muted);
  background: var(--editor);
  font: 0.64rem/1.6 "JetBrains Mono", "SFMono-Regular", monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

export const TutorPanel = styled.aside<{ visible: boolean }>`
  ${panelVisibility};
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 1rem;
  background: radial-gradient(
      circle at 100% 0,
      rgba(126, 71, 244, 0.08),
      transparent 19rem
    ),
    var(--panel);
  box-shadow: var(--shadow);
`;

export const TutorResizeHandle = styled.button`
  position: absolute;
  z-index: 5;
  top: 0;
  bottom: 0;
  left: -0.5rem;
  width: 1rem;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: col-resize;
  touch-action: none;

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    left: calc(50% - 1px);
    width: 2px;
    height: 3.5rem;
    border-radius: 999px;
    background: var(--line-strong);
    opacity: 0.72;
    transform: translateY(-50%);
    transition: height 150ms ease, background 150ms ease, opacity 150ms ease;
  }

  &:hover::after,
  &:focus-visible::after {
    height: 5rem;
    background: var(--accent);
    opacity: 1;
  }

  &:focus-visible {
    outline: none;
  }

  @media (max-width: 1100px) {
    display: none;
  }
`;

export const TutorHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid var(--line);
`;

export const TutorIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;

  strong {
    font-size: 0.82rem;
  }
`;

export const TutorOrb = styled.div`
  width: 2.55rem;
  height: 2.55rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #29104c;
  background: linear-gradient(145deg, #69f8c1 12%, #5ed8ff 46%, #c86bff 78%);
  box-shadow: 0 0 1.5rem rgba(100, 220, 255, 0.18);
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.66rem;
  font-weight: 900;
`;

export const Messages = styled.div`
  flex: 1;
  overflow: auto;
  padding: 0.9rem 0.75rem;
`;

export const Message = styled.div<{ role: TutorMessage["role"] }>`
  position: relative;
  margin: 0 0 0.8rem;
  padding: 1rem;
  border: 1px solid
    ${({ role }) =>
      role === "learner" ? "var(--line-strong)" : "rgba(139, 92, 246, .24)"};
  border-radius: ${({ role }) =>
    role === "learner"
      ? ".85rem .25rem .85rem .85rem"
      : ".25rem .85rem .85rem .85rem"};
  background: ${({ role }) =>
    role === "learner"
      ? "var(--panel-soft)"
      : "linear-gradient(135deg, var(--panel-raised), var(--panel))"};

  p {
    margin: 0;
    font-size: 0.82rem;
    line-height: 1.7;
  }

  > div:not(:first-child) {
    font-size: 0.82rem;
    line-height: 1.7;
  }
`;

export const MessageRole = styled.span`
  display: block;
  margin-bottom: 0.45rem;
  color: var(--accent);
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.12em;
`;

export const TutorialStageMeta = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.65rem;
  margin: 0 0 0.8rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--line);

  > span {
    width: 2.15rem;
    height: 2.15rem;
    display: grid;
    place-items: center;
    border: 1px solid var(--accent);
    border-radius: 50%;
    color: var(--accent);
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
    font-size: 0.6rem;
    font-weight: 800;
  }

  > div {
    display: flex;
    flex-direction: column;
    gap: 0.08rem;
  }

  small {
    color: var(--muted);
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
    font-size: 0.52rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  strong {
    color: var(--ink);
    font-size: 0.76rem;
  }
`;

export const TutorialMessageAction = styled.button`
  width: 100%;
  min-height: 2.65rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.9rem;
  padding: 0 0.85rem;
  border: 0;
  border-radius: 0.6rem;
  color: var(--callout-action-ink);
  background: var(--callout-action);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 850;
  cursor: pointer;

  span {
    font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  }

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 18px color-mix(in srgb, var(--acid) 20%, transparent);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.5;
  }
`;

export const TypingStatus = styled.span`
  display: block;
  margin-top: 0.45rem;
  color: var(--muted);
  font-family: "JetBrains Mono", "SFMono-Regular", monospace;
  font-size: 0.62rem;
`;

export const PatchCard = styled.div`
  margin-bottom: 0.8rem;
  padding: 0.85rem;
  border-radius: 0.75rem;
  background: var(--panel-raised);

  h3 {
    margin: 0.35rem 0;
    font-size: 0.75rem;
  }
  > p {
    color: var(--muted);
    font-size: 0.68rem;
    line-height: 1.5;
  }
`;

export const LearningObjective = styled.div`
  padding: 0.55rem;
  background: rgba(200, 255, 77, 0.06);
  color: var(--muted);
  font-size: 0.66rem;
  line-height: 1.45;

  span {
    display: block;
    margin-bottom: 0.18rem;
    color: var(--acid);
    font-size: 0.56rem;
  }
`;

export const PatchFiles = styled.div`
  margin: 0.65rem 0;

  div {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.45rem;
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--line);
    font-size: 0.64rem;
  }

  span {
    color: var(--acid);
  }
  code {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  small {
    color: var(--muted);
  }
`;

export const PatchActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;

  > button:first-child {
    border: 0;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: 0.65rem;
    cursor: pointer;
  }
`;

export const UndoCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--line-strong);
  border-radius: 0.3rem;
  color: var(--muted);
  font-size: 0.65rem;

  button {
    border: 0;
    background: none;
    color: var(--acid);
    font: inherit;
    cursor: pointer;
  }
`;

export const QuickPrompts = styled.div`
  display: flex;
  gap: 0.4rem;
  padding: 0.55rem 0.75rem;
  border-top: 1px solid var(--line);

  button {
    flex: 1;
    min-height: 2.8rem;
    padding: 0.55rem;
    border: 1px solid var(--line);
    border-radius: 0.65rem;
    background: var(--panel);
    color: var(--ink);
    font: inherit;
    font-size: 0.65rem;
    cursor: pointer;

    &:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
  }
`;

export const Composer = styled.form`
  margin: 0 0.75rem 0.75rem;
  border: 1px solid var(--line-strong);
  border-radius: 0.75rem;
  background: var(--panel-soft);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);

  textarea {
    width: 100%;
    resize: none;
    border: 0;
    outline: 0;
    padding: 0.7rem;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 0.72rem;
    line-height: 1.5;

    &::placeholder {
      color: var(--muted);
    }
  }
`;

export const ComposerFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.42rem 0.5rem 0.48rem 0.7rem;

  span {
    color: var(--muted);
    font-size: 0.58rem;
  }

  button {
    width: 1.8rem;
    height: 1.8rem;
    border: 0;
    border-radius: 0.45rem;
    background: var(--gradient);
    color: #ffffff;
    font: inherit;
    font-weight: 900;
    cursor: pointer;

    &:disabled {
      background: var(--disabled);
      color: var(--disabled-ink);
      cursor: default;
    }
  }
`;
