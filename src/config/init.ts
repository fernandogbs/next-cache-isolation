import { access, writeFile } from "node:fs/promises";
import path from "node:path";

import { DEFAULT_CONFIG_FILENAME } from "./loader.js";

const TEMPLATE = `# next-cache-isolation custom suite
# Each path must contain an nci.fixture.json (see published fixtures for shape).
version: 1
suite: custom
# basePort: 43110
fixtures:
  # - path: ./nci/my-scenario
  - path: ./fixtures/example-scenario
`;

export type InitOptions = {
  cwd?: string;
  force?: boolean;
};

export async function initCustomSuiteConfig(
  options: InitOptions = {},
): Promise<{ configPath: string; created: boolean }> {
  const cwd = options.cwd ?? process.cwd();
  const configPath = path.resolve(cwd, DEFAULT_CONFIG_FILENAME);

  let exists = true;
  try {
    await access(configPath);
  } catch {
    exists = false;
  }

  if (exists && !options.force) {
    throw new Error(
      `${DEFAULT_CONFIG_FILENAME} already exists (pass --force to overwrite)`,
    );
  }

  await writeFile(configPath, TEMPLATE, "utf8");
  return { configPath, created: true };
}
