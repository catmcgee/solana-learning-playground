import { LEARNING_EXAMPLES } from "../examples";

describe("learning examples", () => {
  it("keeps the three beginner programs in their intended order", () => {
    expect(LEARNING_EXAMPLES.map(({ id }) => id)).toEqual([
      "hello-solana",
      "account-data",
      "counter",
    ]);
    expect(LEARNING_EXAMPLES.map(({ order }) => order)).toEqual([1, 2, 3]);
  });

  it("pins every lesson to its Foundation source and a runnable test", () => {
    for (const example of LEARNING_EXAMPLES) {
      expect(example.sourceUrl).toContain(
        "solana-foundation/program-examples/tree/e55d2e6b8580b1488a06df8920d939f5bd60942d"
      );
      expect(example.files.some(([path]) => path.startsWith("tests/"))).toBe(
        true
      );
    }
  });
});
