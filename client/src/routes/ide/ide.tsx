import { PgRouter } from "../../utils";
import { handleRoute } from "../common";

export const ide = PgRouter.create({
  path: "/ide",
  handle: () => handleRoute(),
});
