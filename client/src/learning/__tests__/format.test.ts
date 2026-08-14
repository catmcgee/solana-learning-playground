import {
  cleanTerminalOutput,
  formatRpcLabel,
  humanizeInstructionName,
  normalizeRpcUrl,
} from "../format";

describe("learning formatting", () => {
  it("accepts HTTP RPC URLs and rejects other protocols", () => {
    expect(normalizeRpcUrl(" https://rpc.example/path ")).toBe(
      "https://rpc.example/path"
    );
    expect(() => normalizeRpcUrl("ws://rpc.example")).toThrow(
      "Use an HTTP or HTTPS Solana RPC URL."
    );
  });

  it("creates concise RPC and instruction labels", () => {
    expect(formatRpcLabel("https://rpc.example/path?token=secret")).toBe(
      "rpc.example/path"
    );
    expect(humanizeInstructionName("initialize_vaultAccount")).toBe(
      "Initialize vault Account"
    );
  });

  it("removes terminal escape sequences and carriage returns", () => {
    expect(cleanTerminalOutput("\u001b[31merror\u001b[0m\r\nnext\n")).toEqual([
      "error",
      "next",
    ]);
  });
});
