import type { Idl } from "../idl-types";
import { getIdlType } from "../idl-types";

jest.mock("../../web3", () => ({ PgWeb3: {} }));

const idl: Idl = {
  version: "0.1.0",
  name: "test",
  instructions: [],
  types: [
    {
      name: "Settings",
      type: {
        kind: "struct",
        fields: [
          { name: "count", type: "u8" },
          { name: "enabled", type: "bool" },
        ],
      },
    },
    {
      name: "Status",
      type: {
        kind: "enum",
        variants: [
          { name: "Ready" },
          { name: "Count", fields: ["u8"] },
          { name: "Named", fields: [{ name: "value", type: "u8" }] },
        ],
      },
    },
  ],
};

describe("getIdlType", () => {
  test("resolves primitive and container types", () => {
    expect(getIdlType("u8").parse("42")).toBe(42);
    expect(getIdlType({ option: "u8" }).parse("none")).toBeNull();
    expect(getIdlType({ array: ["bool", 2] }).parse("[true, false]")).toEqual([
      true,
      false,
    ]);
  });

  test("parses and serializes defined structs", () => {
    const settings = getIdlType({ defined: "Settings" }, idl);

    expect(settings.parse("{ count: 7, enabled: true }")).toEqual({
      count: 7,
      enabled: true,
    });
    const toBuffer = settings.toBuffer as (value: unknown) => Buffer;
    expect(Array.from(toBuffer({ count: 7, enabled: true }))).toEqual([7, 1]);
  });

  test("handles unit, tuple, and named enum variants", () => {
    const status = getIdlType({ defined: "Status" }, idl);

    expect(status.parse("Ready")).toEqual({ ready: {} });
    expect(status.parse("{ count: [9] }")).toEqual({ count: [9] });
    expect(status.parse("{ named: { value: 4 } }")).toEqual({
      named: { value: 4 },
    });
    const toBuffer = status.toBuffer as (value: unknown) => Buffer;
    expect(Array.from(toBuffer({ count: [9] }))).toEqual([1, 9]);
  });
});
