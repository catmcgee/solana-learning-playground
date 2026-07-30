import { PgRouter } from "../../utils";

export const tutorials = PgRouter.create({
  path: "/tutorials/{name}/{page}",
  // TutorialShell imports direct tutorial URLs into the main Playground.
  // Keep the route handler inert so the legacy tutorial UI cannot race it.
  handle: () => ({ dispose: () => {} }),
});
