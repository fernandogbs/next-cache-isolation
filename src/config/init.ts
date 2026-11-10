import { access, writeFile } from "node:fs/promises";
import path from "node:path";

import { DEFAULT_CONFIG_FILENAME } from "./loader.js";

const TEMPLATE = `# next-cache-isolation custom suite
# Each entry is a Next app directory. Prefer nci.fixture.json on disk,
# or embed the same FixtureManifest under "manifest:" (inline wins).
version: 1
suite: custom
# basePort: 43110
fixtures:
  # Path-only: loads <path>/nci.fixture.json
  - path: ./fixtures/example-scenario
  # Inline manifest (same schema as nci.fixture.json):
  # - path: ./my-app
  #   manifest:
  #     id: my-app-isolation
  #     advisory: CUSTOM
  #     expected: PASS
  #     nextVersion: 16.4.5
  #     cacheComponents: true
  #     healthPath: /nci/health
  #     cachePolicy: memory
  #     scenario:
  #       id: tenant-swap-demo
  #       procedure: tenant-swap
  #       path: /app
  #       contexts:
  #         - id: a
  #           sentinel: TENANT_A
  #           headers: { x-tenant: a }
  #         - id: b
  #           sentinel: TENANT_B
  #           headers: { x-tenant: b }
  #       oracle:
  #         type: excludes-other-tenants
  #         warmContext: a
  #         observeContext: b
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
