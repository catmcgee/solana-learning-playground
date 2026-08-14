export const normalizeRpcUrl = (value: string) => {
  const normalized = new URL(value.trim());
  if (normalized.protocol !== "http:" && normalized.protocol !== "https:") {
    throw new Error("Use an HTTP or HTTPS Solana RPC URL.");
  }
  return normalized.toString();
};

export const formatRpcLabel = (value: string) => {
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return value.replace(/^https?:\/\//, "").split(/[?#]/, 1)[0];
  }
};

export const humanizeInstructionName = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());

export const cleanTerminalOutput = (message: string) => {
  let clean = "";
  let inEscapeSequence = false;

  for (const character of message) {
    if (character.charCodeAt(0) === 27) {
      inEscapeSequence = true;
      continue;
    }
    if (inEscapeSequence) {
      if (/[A-Za-z]/.test(character)) inEscapeSequence = false;
      continue;
    }
    if (character !== "\r") clean += character;
  }

  return clean.split("\n").filter(Boolean);
};
