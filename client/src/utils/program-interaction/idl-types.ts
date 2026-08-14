import type { Idl, IdlType } from "@coral-xyz/anchor/dist/cjs/idl";

import type { PgIdlType } from "./idl-type";
import { getCompositeIdlType } from "./idl-composites";
import { getPrimitiveIdlType } from "./idl-primitives";

export type {
  Idl,
  IdlAccount,
  IdlInstruction,
  IdlType,
} from "@coral-xyz/anchor/dist/cjs/idl";

/**
 * Get IDL type, i.e. an object that has all the necessary data to handle
 * operations of the given IDL type.
 *
 * @param idlType Anchor IDL type
 * @param idl Anchor IDL(only required for defined types)
 * @returns the IDL type
 */
export const getIdlType = <T extends IdlType>(
  idlType: T,
  idl?: Idl
): PgIdlType<T> => {
  if (typeof idlType === "string") {
    const primitive = getPrimitiveIdlType(idlType);
    if (!primitive) throw new Error(`Unknown IDL type: ${idlType}`);
    return primitive as PgIdlType<T>;
  }

  return getCompositeIdlType(idlType, idl, getIdlType) as PgIdlType<T>;
};
