import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadCustomSuiteConfig } from "../../src/config/loader.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

describe("examples/tenant-swap.inline.yml", () => {
  it("parses the inline tenant-swap manifest", async () => {
    const resolved = await loadCustomSuiteConfig(
      path.join(repoRoot, "examples/tenant-swap.inline.yml"),
    );
    expect(resolved.fixtures).toHaveLength(1);
    expect(resolved.fixtures[0]?.manifest?.id).toBe(
      "tenant-swap-inline-demo",
    );
    expect(resolved.fixtures[0]?.manifest?.scenario.procedure).toBe(
      "tenant-swap",
    );
    expect(resolved.fixtures[0]?.manifest?.scenario.oracle.type).toBe(
      "excludes-other-tenants",
    );
  });
});
