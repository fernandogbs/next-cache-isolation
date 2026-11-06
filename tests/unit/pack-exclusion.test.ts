import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

describe("npm pack contents", () => {
  it("excludes fixture app trees from the published tarball", () => {
    const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    const parsed = JSON.parse(output) as
      | Array<{ files: Array<{ path: string }> }>
      | Record<string, { files: Array<{ path: string }> }>;

    const files = Array.isArray(parsed)
      ? (parsed[0]?.files.map((file) => file.path) ?? [])
      : (Object.values(parsed)[0]?.files.map((file) => file.path) ?? []);

    expect(files.some((file) => file.startsWith("fixtures/"))).toBe(false);
    expect(files.some((file) => file.startsWith("catalogs/"))).toBe(true);
  });
});
