import {
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
      { workspaceName: "my-vault", createdAt: 10 },
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
      ])
    );

    expect(readCustomPrograms()).toEqual([
      { workspaceName: "my-vault", createdAt: 10 },
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
});
