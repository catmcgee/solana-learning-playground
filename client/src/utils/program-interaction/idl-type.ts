import type { DecodeType } from "@coral-xyz/anchor";
import type { IdlType } from "@coral-xyz/anchor/dist/cjs/idl";

import type { OrString } from "../types";

export interface PgIdlType<
  T extends IdlType,
  V extends DecodeType<T, never> = DecodeType<T, never>
> {
  /** Display name to show in UI */
  name: OrString<Exclude<T, object>>;
  /**
   * Parse from string to the IDL type's JS equivalent.
   *
   * @param value string value
   * @returns the parsed value
   */
  parse: (value: string) => V;
  /**
   * Serialize the type.
   *
   * **NOTE:** This is default serialization and is **not** related to `borsh`.
   *
   * @param value parsed value
   * @returns the serialized bytes
   */
  toBuffer: (value: V) => Buffer;
  /**
   * Generate a stringified random value.
   *
   * @returns the generated value
   */
  generateRandom: () => string;
}

/** Preserve Anchor's decoded type while building an IDL type handler. */
export const createIdlType = <T extends IdlType>(idlType: PgIdlType<T>) =>
  idlType;
