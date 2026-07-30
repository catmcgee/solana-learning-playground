import { PgRouter } from "../../utils";

export const defaultRoute = PgRouter.create({
  path: "/",
  // The learning shell owns the root route and initializes its workspace.
  // Keep the legacy IDE mounted only on `/ide`.
  handle: () => ({ dispose: () => {} }),
});
