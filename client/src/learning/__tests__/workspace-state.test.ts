import {
  createLearningEvent,
  createWorkspaceLearningState,
} from "../workspace-state";

describe("workspace learning state", () => {
  it("creates a lesson-aware initial state", () => {
    const state = createWorkspaceLearningState("learn-hello-solana");

    expect(state.messages[0].text).toContain("Welcome to **Hello, Solana**");
    expect(state.events[0]).toMatchObject({
      kind: "network",
      status: "idle",
    });
    expect(state.programStage).toBe("source");
  });

  it("creates complete activity events", () => {
    const event = createLearningEvent(
      "build",
      "Build complete",
      "The program compiled.",
      "success"
    );

    expect(event).toMatchObject({
      kind: "build",
      title: "Build complete",
      status: "success",
    });
    expect(event.id).toBeTruthy();
    expect(event.time).toEqual(expect.any(Number));
  });
});
