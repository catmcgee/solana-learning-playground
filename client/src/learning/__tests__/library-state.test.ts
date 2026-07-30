import {
  getAnchorProgramName,
  getCustomProgramDisplayName,
  readCustomPrograms,
  renameCustomProgram,
  writeCustomPrograms,
} from "../library-state";

describe("custom program library state", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists custom workspace names in creation order", () => {
    const programs = [
      { workspaceName: "my-vault", programName: "vault", createdAt: 10 },
      { workspaceName: "token-tracker", createdAt: 20 },
    ];

    writeCustomPrograms(programs);

    expect(readCustomPrograms()).toEqual(programs);
  });

  it("drops malformed and duplicate saved entries", () => {
    localStorage.setItem(
      "solpg-learning-custom-programs-v1",
      JSON.stringify([
        { workspaceName: "my-vault", createdAt: 10 },
        { workspaceName: "my-vault", createdAt: 30 },
        { workspaceName: "", createdAt: 40 },
        { workspaceName: "missing-time" },
        {
          workspaceName: "invalid-name",
          programName: "not valid Rust",
          createdAt: 50,
        },
      ])
    );

    expect(readCustomPrograms()).toEqual([
      { workspaceName: "my-vault", createdAt: 10 },
      { workspaceName: "invalid-name", createdAt: 50 },
    ]);
  });

  it("keeps the custom entry while adopting a live workspace rename", () => {
    expect(
      renameCustomProgram(
        [
          { workspaceName: "learn-my-program-1", createdAt: 10 },
          { workspaceName: "other-program", createdAt: 20 },
        ],
        "learn-my-program-1",
        "greeting-machine"
      )
    ).toEqual([
      { workspaceName: "greeting-machine", createdAt: 10 },
      { workspaceName: "other-program", createdAt: 20 },
    ]);
  });

  it("derives the learner-facing name from the Anchor program module", () => {
    const source = `
pub mod helpers {}

#[program]
pub mod hello {
  use super::*;
}
`;

    expect(getAnchorProgramName(source)).toBe("hello");
    expect(
      getCustomProgramDisplayName({
        workspaceName: "learn-my-program-5",
        programName: getAnchorProgramName(source),
        createdAt: 10,
      })
    ).toBe("hello");
  });

  it("supports raw Rust identifiers and falls back to the workspace name", () => {
    expect(getAnchorProgramName("#[program]\npub mod r#match {}")).toBe(
      "match"
    );
    expect(
      getCustomProgramDisplayName({
        workspaceName: "learn-my-program-5",
        createdAt: 10,
      })
    ).toBe("learn-my-program-5");
  });
});
