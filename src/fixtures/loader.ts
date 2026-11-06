import { readFile } from "node:fs/promises";
import path from "node:path";

import { FixtureManifestSchema, type FixtureManifest } from "./manifest.js";

export async function loadFixtureManifest(
  fixtureDirectory: string,
): Promise<FixtureManifest> {
  const filePath = path.join(fixtureDirectory, "nci.fixture.json");
  const raw = await readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  return FixtureManifestSchema.parse(parsed);
}

export function interpolatePath(
  template: string,
  rootParams: Record<string, string>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
    const value = rootParams[key];
    if (value === undefined) {
      throw new Error(`Missing root param "${key}" for path ${template}`);
    }
    return encodeURIComponent(value);
  });
}
