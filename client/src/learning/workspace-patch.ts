import type { WorkspacePatch } from "./types";

const MAX_PATCH_FILES = 16;
const MAX_FILE_CONTENT_LENGTH = 128 * 1024;

export const validateWorkspacePatch = (
  value: Record<string, unknown>
): WorkspacePatch => {
  const files = Array.isArray(value.files) ? value.files : [];
  if (!files.length || files.length > MAX_PATCH_FILES) {
    throw new Error("The tutor proposed an invalid number of files.");
  }

  const validatedFiles = files.map((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      throw new Error("The tutor proposed an unsafe workspace path.");
    }

    const { path, content } = candidate as Record<string, unknown>;
    const validRoot =
      typeof path === "string" &&
      (path.startsWith("src/") || path.startsWith("tests/"));
    if (
      !validRoot ||
      path.includes("..") ||
      path.includes("//") ||
      typeof content !== "string" ||
      content.length > MAX_FILE_CONTENT_LENGTH
    ) {
      throw new Error("The tutor proposed an unsafe workspace path.");
    }

    return { path, content };
  });

  return {
    title:
      typeof value.title === "string" ? value.title : "Tutor code proposal",
    explanation: typeof value.explanation === "string" ? value.explanation : "",
    learningObjective:
      typeof value.learningObjective === "string"
        ? value.learningObjective
        : "",
    files: validatedFiles,
  };
};
