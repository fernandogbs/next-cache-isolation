import {
  evaluateBodySentinel,
  type BodySentinelOracleInput,
  type OracleResult,
} from "./body-sentinel.js";

function tryParseJsonString(raw: string): string | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function decodeJsonEscapes(raw: string): string {
  try {
    return JSON.parse(`"${raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  } catch {
    return raw
      .replace(/\\u([0-9a-fA-F]{4})/g, (_match, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
      )
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
}

function extractNextFPushChunks(html: string): string[] {
  const chunks: string[] = [];
  const pattern = /__next_f\.push\(\[(\d+),("[\s\S]*?")\]\)/g;
  for (const match of html.matchAll(pattern)) {
    const encoded = match[2];
    if (!encoded) {
      continue;
    }
    const decoded = tryParseJsonString(encoded);
    if (decoded !== null) {
      chunks.push(decoded);
      continue;
    }
    chunks.push(encoded);
  }
  return chunks;
}

/**
 * Decode Next.js text Flight (RSC: 1) into a searchable string.
 * Also accepts HTML documents that embed self.__next_f.push payloads.
 */
export function decodeFlightText(body: string): string {
  const pieces: string[] = [];

  if (body.includes("__next_f.push")) {
    pieces.push(...extractNextFPushChunks(body));
  }

  for (const line of body.split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon <= 0) {
      continue;
    }
    const payload = line.slice(colon + 1).trim();
    if (!payload) {
      continue;
    }

    if (payload.startsWith('"')) {
      const asString = tryParseJsonString(payload);
      if (asString !== null) {
        pieces.push(asString);
        continue;
      }
      pieces.push(decodeJsonEscapes(payload.slice(1, -1)));
      continue;
    }

    // Arrays / objects: pull every JSON string leaf via a simple scan.
    const stringLiteral = /"((?:\\.|[^"\\])*)"/g;
    for (const match of payload.matchAll(stringLiteral)) {
      const inner = match[1];
      if (inner === undefined) {
        continue;
      }
      pieces.push(decodeJsonEscapes(inner));
    }
  }

  return pieces.join("");
}

export function evaluateFlightSentinel(
  input: BodySentinelOracleInput,
  durationMs: number,
): OracleResult {
  return evaluateBodySentinel(
    {
      ...input,
      body: decodeFlightText(input.body),
    },
    durationMs,
  );
}
