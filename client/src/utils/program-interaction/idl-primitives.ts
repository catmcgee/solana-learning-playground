import { BN } from "@coral-xyz/anchor";

import { PgCommon } from "../common";
import { PgWeb3 } from "../web3";
import { createIdlType, type PgIdlType } from "./idl-type";

const publicKey = createIdlType({
  name: "publicKey",
  parse: (value) => new PgWeb3.PublicKey(string.parse(value)),
  toBuffer: (value) => value.toBuffer(),
  generateRandom: () => PgWeb3.Keypair.generate().publicKey.toBase58(),
});

const string = createIdlType({
  name: "string",
  // Remove the quotes from string in order to make struct inputs intuitive
  // e.g. `{ name: "Abc" }` should be parsed as "Abc" instead of "\"Abc\"".
  // Maybe replace only the first and the last quotes?
  parse: (value) => value.replaceAll('"', "").replaceAll("'", ""),
  toBuffer: (value) => Buffer.from(value),
  generateRandom: () => {
    return Buffer.from(
      new Array(4).fill(0).map(() => PgCommon.generateRandomInt(65, 122))
    ).toString();
  },
});

const bool = createIdlType({
  name: "bool",
  parse: (value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    throw new Error("Invalid bool");
  },
  toBuffer: (value) => Buffer.from([value ? 1 : 0]),
  generateRandom: () => (PgCommon.generateRandomInt(0, 1) ? "true" : "false"),
});

const u8 = createIdlType({
  name: "u8",
  parse: (value) => {
    assertUint(value, 1);
    return parseInt(value);
  },
  toBuffer: (value) => Buffer.from([value]),
  generateRandom: () => generateRandomUint(1),
});

const u16 = createIdlType({
  name: "u16",
  parse: (value) => {
    assertUint(value, 2);
    return parseInt(value);
  },
  toBuffer: (value) => new BN(value).toArrayLike(Buffer, "le", 2),
  generateRandom: () => generateRandomUint(2),
});

const u32 = createIdlType({
  name: "u32",
  parse: (value) => {
    assertUint(value, 4);
    return parseInt(value);
  },
  toBuffer: (value) => new BN(value).toArrayLike(Buffer, "le", 4),
  generateRandom: () => generateRandomUint(4),
});

const u64 = createIdlType({
  name: "u64",
  parse: (value) => {
    assertUint(value, 8);
    return new BN(value);
  },
  toBuffer: (value) => value.toArrayLike(Buffer, "le", 8),
  generateRandom: () => generateRandomUint(8),
});

const u128 = createIdlType({
  name: "u128",
  parse: (value) => {
    assertUint(value, 16);
    return new BN(value);
  },
  toBuffer: (value) => value.toArrayLike(Buffer, "le", 16),
  generateRandom: () => generateRandomUint(16),
});

const i8 = createIdlType({
  name: "i8",
  parse: (value) => {
    assertInt(value, 1);
    return parseInt(value);
  },
  toBuffer: (value) => Buffer.from([value]),
  generateRandom: () => generateRandomInt(1),
});

const i16 = createIdlType({
  name: "i16",
  parse: (value) => {
    assertInt(value, 2);
    return parseInt(value);
  },
  toBuffer: (value) => new BN(value).toArrayLike(Buffer, "le", 2),
  generateRandom: () => generateRandomInt(2),
});

const i32 = createIdlType({
  name: "i32",
  parse: (value) => {
    assertInt(value, 4);
    return parseInt(value);
  },
  toBuffer: (value) => new BN(value).toArrayLike(Buffer, "le", 4),
  generateRandom: () => generateRandomInt(4),
});

const i64 = createIdlType({
  name: "i64",
  parse: (value) => {
    assertInt(value, 8);
    return new BN(value);
  },
  toBuffer: (value) => value.toArrayLike(Buffer, "le", 8),
  generateRandom: () => generateRandomInt(8),
});

const i128 = createIdlType({
  name: "i128",
  parse: (value) => {
    assertInt(value, 16);
    return new BN(value);
  },
  toBuffer: (value) => value.toArrayLike(Buffer, "le", 16),
  generateRandom: () => generateRandomInt(16),
});

const f32 = createIdlType({
  name: "f32",
  parse: (value) => {
    if (!PgCommon.isFloat(value)) throw new Error("Invalid float");
    return parseFloat(value);
  },
  toBuffer: (value) => {
    const buf = Buffer.alloc(4);
    buf.writeFloatLE(value);
    return buf;
  },
  generateRandom: () => Math.random().toString(),
});

const f64 = createIdlType({
  name: "f64",
  parse: (value) => {
    if (!PgCommon.isFloat(value)) throw new Error("Invalid float");
    return parseFloat(value);
  },
  toBuffer: (value) => {
    const buf = Buffer.alloc(8);
    buf.writeFloatLE(value);
    return buf;
  },
  generateRandom: () => Math.random().toString(),
});

const bytes = createIdlType({
  name: "bytes",
  parse: (value) => {
    const array: number[] = JSON.parse(value);
    const isValid = array.every((el) => el === 0 || u8.parse(el.toString()));
    if (!isValid) throw new Error("Invalid bytes");
    return Buffer.from(array);
  },
  toBuffer: (value) => value,
  generateRandom: () => {
    const randomBytes = new Uint8Array(4);
    crypto.getRandomValues(randomBytes);
    return JSON.stringify(Array.from(randomBytes));
  },
});

/**
 * Assert whether the given value is parsable to an unsigned integer and is
 * within the allowed range.
 *
 * @param value input
 * @param len byte length for the unsigned integer
 */
function assertUint(value: string, len: number) {
  if (value === "") throw new Error("Cannot be empty");

  const bn = new BN(value);
  if (bn.isNeg()) {
    throw new Error(`uint cannot be negative: ${value}`);
  }
  if (bn.gt(new BN(new Array(len).fill(0xff)))) {
    throw new Error(`${value} is not within range`);
  }
}

/**
 * Assert whether the given value is parsable to an signed integer and is
 * within the allowed range.
 *
 * @param value input
 * @param len byte length for the signed integer
 */
function assertInt(value: string, len: number) {
  if (value === "") throw new Error("Cannot be empty");

  const bn = new BN(value);
  const intMax = new BN(new Array(len).fill(0xff)).divn(2);
  if (bn.gt(intMax) || bn.lt(intMax.addn(1).neg())) {
    throw new Error(`${value} is not within range`);
  }
}

/**
 * Generate a random unsigned integer for the given byte length.
 *
 * @param len byte length
 * @returns the randomly generated unsigned integer
 */
function generateRandomUint(len: number) {
  return PgCommon.generateRandomBigInt(
    0n,
    BigInt(new BN(new Array(len).fill(0xff)).toString())
  ).toString();
}

/**
 * Generate a random signed integer for the given byte length.
 *
 * @param len byte length
 * @returns the randomly generated signed integer
 */
function generateRandomInt(len: number) {
  const max = BigInt(new BN(new Array(len).fill(0xff)).toString()) / 2n;
  return PgCommon.generateRandomBigInt(-(max + 1n), max).toString();
}

const primitiveTypes = {
  bool,
  bytes,
  f32,
  f64,
  i8,
  i16,
  i32,
  i64,
  i128,
  publicKey,
  string,
  u8,
  u16,
  u32,
  u64,
  u128,
};

export const getPrimitiveIdlType = (
  idlType: string
): PgIdlType<any, any> | undefined =>
  primitiveTypes[idlType as keyof typeof primitiveTypes];
