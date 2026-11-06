import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AdvisoryCatalogEntrySchema,
  type AdvisoryCatalogEntry,
} from "./types.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export function defaultCatalogRoot(): string {
  // Prefer package root catalogs/ whether running from src (vitest) or dist/.
  const candidates = [
    path.resolve(moduleDir, "../../catalogs/advisories"),
    path.resolve(moduleDir, "../../../catalogs/advisories"),
    path.resolve(process.cwd(), "catalogs/advisories"),
  ];

  return candidates[0]!;
}

export async function loadAdvisory(
  id: string,
  catalogRoot: string = defaultCatalogRoot(),
): Promise<AdvisoryCatalogEntry> {
  const filePath = path.join(catalogRoot, `${id}.json`);
  const raw = await readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  return AdvisoryCatalogEntrySchema.parse(parsed);
}

export async function loadGhsaMfr8(
  catalogRoot?: string,
): Promise<AdvisoryCatalogEntry> {
  return loadAdvisory("GHSA-mfr8-8qww-v76h", catalogRoot);
}
