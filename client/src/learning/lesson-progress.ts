import type { LearningExample } from "./examples";

const PROGRESS_KEY = "solpg-learning-progress";

export type LessonProgress = Partial<
  Record<LearningExample["id"], "built" | "deployed">
>;

export const readLessonProgress = (): LessonProgress => {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}");
  } catch {
    return {};
  }
};

export const markLessonProgress = (
  lesson: LearningExample["id"],
  state: "built" | "deployed"
) => {
  const progress = readLessonProgress();
  progress[lesson] = state;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
};
