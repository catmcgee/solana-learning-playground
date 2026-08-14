import { validateWorkspacePatch } from "../workspace-patch";

describe("validateWorkspacePatch", () => {
  it("normalizes valid tutor output", () => {
    expect(
      validateWorkspacePatch({
        files: [{ path: "src/lib.rs", content: "pub mod example {}" }],
      })
    ).toEqual({
      title: "Tutor code proposal",
      explanation: "",
      learningObjective: "",
      files: [{ path: "src/lib.rs", content: "pub mod example {}" }],
    });
  });

  it("rejects unsafe files", () => {
    const unsafeFileLists: unknown[][] = [
      [],
      [null],
      [{ path: "Anchor.toml", content: "" }],
      [{ path: "src/../Anchor.toml", content: "" }],
      [{ path: "src//lib.rs", content: "" }],
      [{ path: "src/lib.rs", content: 42 }],
    ];

    for (const files of unsafeFileLists) {
      expect(() => validateWorkspacePatch({ files })).toThrow();
    }
  });
});
