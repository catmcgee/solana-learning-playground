import { useEffect, useState } from "react";
import styled from "styled-components";

import { loadTutorialWorkspace } from "./tutorial-workspace";
import { PgCommon, PgRouter, PgTutorial } from "../utils";

/**
 * Tutorial URLs are compatibility entry points, not a separate experience.
 * They import the requested workspace and immediately return to the Playground.
 */
const TutorialShell = () => {
  const [error, setError] = useState<string>();
  const tutorialName = PgRouter.location.pathname.split("/")[2];
  const tutorial = PgTutorial.all.find(
    (candidate) => PgCommon.toKebabFromTitle(candidate.name) === tutorialName
  );

  useEffect(() => {
    let active = true;

    const open = async () => {
      if (!tutorial) {
        await PgRouter.navigate("/");
        return;
      }

      try {
        await loadTutorialWorkspace(tutorial);
        if (active) await PgRouter.navigate("/");
      } catch (loadError: any) {
        if (active) {
          setError(loadError?.message ?? `Could not open ${tutorial.name}.`);
        }
      }
    };

    void open();
    return () => {
      active = false;
    };
  }, [tutorial]);

  return (
    <Opening role="status">
      <strong>
        {error
          ? "This tutorial could not be opened."
          : `Opening ${tutorial?.name ?? "Playground"}…`}
      </strong>
      {error && (
        <>
          <span>{error}</span>
          <button type="button" onClick={() => PgRouter.navigate("/")}>
            Back to Playground
          </button>
        </>
      )}
    </Opening>
  );
};

const Opening = styled.main`
  width: 100%;
  min-height: 100%;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.75rem;
  padding: 2rem;
  color: var(--text-primary, #f4f4f5);
  background: var(--background, #080b12);
  text-align: center;

  span {
    max-width: 34rem;
    color: var(--text-secondary, #a5adbe);
  }

  button {
    min-height: 2.75rem;
    padding: 0 1rem;
    border: 1px solid currentColor;
    border-radius: 0.65rem;
    color: inherit;
    background: transparent;
    cursor: pointer;
  }
`;

export default TutorialShell;
