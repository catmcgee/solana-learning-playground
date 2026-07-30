import { createContext } from "react";

import type { TutorialComponentProps } from "../components/Tutorial/types";

export type TutorialRenderer = (
  props: TutorialComponentProps
) => JSX.Element | null;

export const TutorialRenderContext = createContext<TutorialRenderer | null>(
  null
);
