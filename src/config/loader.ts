import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import {
  CustomSuiteConfigSchema,
  type ResolvedCustomSuiteConfig,
} from "./types.js";

export const DEFAULT_CONFIG_FILENAME = "next-cache-isolation.yml";

export function resolveConfigPath(
  cwd: string,
  configOption?: string,
): string {
  if (configOption) {
    return path.resolve(cwd, configOption);
  }
  return path.resolve(cwd, DEFAULT_CONFIG_FILENAME);
}

export async function loadCustomSuiteConfig(
  configPath: string,
): Promise<ResolvedCustomSuiteConfig> {
  const rawText = await readFile(configPath, "utf8");
  const parsed: unknown = parseYaml(rawText);
  const config = CustomSuiteConfigSchema.parse(parsed);
  const configDir = path.dirname(configPath);

  const fixtures = config.fixtures.map((entry) => {
    const directory = path.resolve(configDir, entry.path);
    return entry.manifest
      ? { directory, manifest: entry.manifest }
      : { directory };
  });

  return {
    configPath,
    basePort: config.basePort,
    fixtures,
    fixtureDirectories: fixtures.map((item) => item.directory),
  };
}
