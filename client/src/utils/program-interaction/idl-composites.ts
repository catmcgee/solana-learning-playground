import type {
  Idl,
  IdlEnumFieldsNamed,
  IdlEnumFieldsTuple,
  IdlEnumVariant,
  IdlType,
  IdlTypeDefStruct,
} from "@coral-xyz/anchor/dist/cjs/idl";

import { PgCommon } from "../common";
import { createIdlType, type PgIdlType } from "./idl-type";

type AnyPgIdlType = PgIdlType<any, any>;
type ResolveIdlType = (idlType: IdlType, idl?: Idl) => AnyPgIdlType;

export const getCompositeIdlType = (
  idlType: Exclude<IdlType, string>,
  idl: Idl | undefined,
  resolve: ResolveIdlType
): AnyPgIdlType => {
  if ("defined" in idlType) {
    return createDefinedType(idlType.defined, idl, resolve);
  }
  if ("option" in idlType) {
    return createOptionType(idlType.option, false, idl, resolve);
  }
  if ("coption" in idlType) {
    return createOptionType(idlType.coption, true, idl, resolve);
  }
  if ("array" in idlType) {
    return createListType(idlType.array[0], idlType.array[1], idl, resolve);
  }
  if ("vec" in idlType) {
    return createListType(idlType.vec, undefined, idl, resolve);
  }

  throw new Error(`Unknown IDL type: ${JSON.stringify(idlType)}`);
};

const createDefinedType = (
  name: string,
  idl: Idl | undefined,
  resolve: ResolveIdlType
): AnyPgIdlType => {
  if (!idl?.types) {
    throw new Error(`Defined type \`${name}\` requires idl.types`);
  }
  const definition = idl.types.find((type) => type.name === name);
  if (!definition) throw new Error(`Type \`${name}\` not found`);

  switch (definition.type.kind) {
    case "struct":
      return createStructType(
        definition.name,
        definition.type.fields,
        idl,
        resolve
      );
    case "enum":
      return createEnumType(
        definition.name,
        definition.type.variants,
        idl,
        resolve
      );
    case "alias":
      return { ...resolve(definition.type.value, idl), name: definition.name };
  }
};

const createStructType = (
  name: string,
  fields: IdlTypeDefStruct,
  idl: Idl,
  resolve: ResolveIdlType
): AnyPgIdlType =>
  createIdlType({
    name,
    parse: (value) => {
      if (!value.startsWith("{") || !value.endsWith("}")) {
        throw new Error("Not an object");
      }

      const inputFields = value.slice(1, -1).split(",");
      if (inputFields.length !== fields.length) {
        throw new Error("Struct fields do not match");
      }

      return inputFields.reduce((result, input) => {
        const [key, fieldValue] = input.split(":").map((part) => part.trim());
        const field = fields.find((candidate) => candidate.name === key);
        if (!field) throw new Error(`Field \`${key}\` not found`);
        result[key] = resolve(field.type, idl).parse(fieldValue);
        return result;
      }, {} as Record<string, unknown>);
    },
    toBuffer: (value) =>
      Buffer.concat(
        Object.entries(value as Record<string, unknown>).map(
          ([key, fieldValue]) => {
            const field = fields.find((candidate) => candidate.name === key);
            if (!field) throw new Error(`Field \`${key}\` not found`);
            return resolve(field.type, idl).toBuffer(fieldValue);
          }
        )
      ),
    generateRandom: () =>
      fields.reduce((result, field, index) => {
        const value = resolve(field.type, idl).generateRandom();
        return `${result}${index ? "," : ""} ${field.name}: ${value}`;
      }, "{") + " }",
  });

const createEnumType = (
  name: string,
  variants: IdlEnumVariant[],
  idl: Idl,
  resolve: ResolveIdlType
): AnyPgIdlType =>
  createIdlType({
    name,
    parse: (value) => parseEnumValue(value, variants, idl, resolve),
    toBuffer: (value) =>
      encodeEnumValue(value as Record<string, unknown>, variants, idl, resolve),
    generateRandom: () => generateEnumValue(variants, idl, resolve),
  });

const parseEnumValue = (
  value: string,
  variants: IdlEnumVariant[],
  idl: Idl,
  resolve: ResolveIdlType
) => {
  try {
    findVariant(variants, value);
    return { [PgCommon.toCamelCase(value)]: {} };
  } catch {
    // Continue with named and tuple variants.
  }

  if (!value.startsWith("{") || !value.endsWith("}")) {
    throw new Error("Not an object");
  }
  const keyValue = value.slice(1, -1).match(/(\S+)(\s*)?:\s+(.+[\]|}])/);
  if (!keyValue) throw new Error("Unable to parse input");

  const variantKey = PgCommon.toCamelCase(keyValue[1]);
  const variantValue = keyValue[3];
  const isNamed = variantValue[0] === "{";
  const isTuple = variantValue[0] === "[";
  if (!isNamed && !isTuple) throw new Error("Unable to parse");

  const parsedValue = handleVariant(
    findVariant(variants, variantKey),
    () => ({}),
    (fields) => createNamedEnumStruct(fields, idl, resolve).parse(variantValue),
    (fields) => {
      const values = variantValue.slice(1, -1).split(",");
      if (values.length !== fields.length)
        throw new Error("Tuple length doesn't match");
      return values.map((item, index) =>
        resolve(fields[index], idl).parse(item.trim())
      );
    }
  );
  return { [variantKey]: parsedValue };
};

const encodeEnumValue = (
  value: Record<string, unknown>,
  variants: IdlEnumVariant[],
  idl: Idl,
  resolve: ResolveIdlType
) => {
  const variantName = Object.keys(value)[0];
  const variantValue = value[variantName];
  const discriminator = variants.findIndex(
    (variant) => PgCommon.toCamelCase(variant.name) === variantName
  );
  const data = handleVariant(
    findVariant(variants, variantName),
    () => Buffer.alloc(0),
    (fields) =>
      Buffer.concat(
        fields.map((field) =>
          resolve(field.type, idl).toBuffer(
            (variantValue as Record<string, unknown>)[field.name]
          )
        )
      ),
    (fields) =>
      Buffer.concat(
        fields.map((field, index) =>
          resolve(field, idl).toBuffer((variantValue as unknown[])[index])
        )
      )
  );
  return Buffer.concat([Buffer.from([discriminator]), data]);
};

const generateEnumValue = (
  variants: IdlEnumVariant[],
  idl: Idl,
  resolve: ResolveIdlType
) => {
  const variant = variants[PgCommon.generateRandomInt(0, variants.length - 1)];
  const name = PgCommon.toCamelCase(variant.name);
  return handleVariant(
    variant,
    () => name,
    (fields) =>
      `{ ${name}: ${createNamedEnumStruct(
        fields,
        idl,
        resolve
      ).generateRandom()} }`,
    (fields) =>
      `{ ${name}: [${fields
        .map((field) => resolve(field, idl).generateRandom())
        .join(", ")}] }`
  );
};

const findVariant = (variants: IdlEnumVariant[], name: string) => {
  const normalizedName = PgCommon.toCamelCase(name);
  const variant = variants.find(
    (candidate) => PgCommon.toCamelCase(candidate.name) === normalizedName
  );
  if (!variant) throw new Error(`Variant \`${name}\` not found`);
  return variant;
};

const handleVariant = <Unit, Named, Tuple>(
  variant: IdlEnumVariant,
  unit: () => Unit,
  named: (fields: IdlEnumFieldsNamed) => Named,
  tuple: (fields: IdlEnumFieldsTuple) => Tuple
) => {
  if (!variant.fields?.length) return unit();
  if ((variant.fields as IdlEnumFieldsNamed)[0].name) {
    return named(variant.fields as IdlEnumFieldsNamed);
  }
  return tuple(variant.fields as IdlEnumFieldsTuple);
};

const createNamedEnumStruct = (
  fields: IdlEnumFieldsNamed,
  idl: Idl,
  resolve: ResolveIdlType
) =>
  createStructType(
    "__",
    fields,
    {
      ...idl,
      types: [
        ...(idl.types ?? []),
        { name: "__", type: { kind: "struct", fields } },
      ],
    },
    resolve
  );

const createOptionType = (
  innerType: IdlType,
  isCOption: boolean,
  idl: Idl | undefined,
  resolve: ResolveIdlType
): AnyPgIdlType => {
  const inner = resolve(innerType, idl);
  const none = isCOption ? [0, 0, 0, 0] : [0];
  const some = isCOption ? [1, 0, 0, 0] : [1];
  return createIdlType({
    ...inner,
    name: `${isCOption ? "C" : ""}Option<${inner.name}>`,
    parse: (value) =>
      ["", "null", "none"].includes(value) ? null : inner.parse(value),
    toBuffer: (value) =>
      value === null
        ? Buffer.from(none)
        : Buffer.concat([Buffer.from(some), inner.toBuffer(value)]),
    generateRandom: () =>
      PgCommon.generateRandomInt(0, 1) ? inner.generateRandom() : "null",
  });
};

const createListType = (
  elementType: IdlType,
  length: number | undefined,
  idl: Idl | undefined,
  resolve: ResolveIdlType
): AnyPgIdlType => {
  const inner = resolve(elementType, idl);
  return createIdlType({
    name:
      length === undefined
        ? `Vec<${inner.name}>`
        : `[${inner.name}; ${length}]`,
    parse: (value) => {
      if (!value.startsWith("[") || !value.endsWith("]")) {
        throw new Error("Not an array");
      }
      const parsed = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map(inner.parse);
      if (length !== undefined && parsed.length !== length) {
        throw new Error("Invalid length");
      }
      return parsed;
    },
    toBuffer: (value) => {
      if (!Array.isArray(value)) throw new Error("Not an array");
      return Buffer.concat(value.map(inner.toBuffer));
    },
    generateRandom: () => {
      const values = new Array(length ?? 4)
        .fill(null)
        .map(() => inner.generateRandom());
      const serialized = JSON.stringify(values);
      return inner.name === "string"
        ? serialized
        : serialized.replaceAll('"', "");
    },
  });
};
