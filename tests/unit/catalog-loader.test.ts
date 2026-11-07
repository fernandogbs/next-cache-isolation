import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadAdvisory, loadGhsaMfr8 } from "../../src/catalog/loader.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const catalogRoot = path.join(repoRoot, "catalogs/advisories");

describe("advisory catalog loader", () => {
  it("loads GHSA-mfr8 without hard-coded version ranges in the loader", async () => {
    const entry = await loadGhsaMfr8(catalogRoot);

    expect(entry.id).toBe("GHSA-mfr8-8qww-v76h");
    expect(entry.affectedRange).toBe(">=16.3.0");
    expect(entry.fixturePatchedPin).toBe("16.4.5");
    expect(entry.fixtureVulnerablePin).toBe("16.3.0");
    expect(entry.url).toContain("GHSA-mfr8-8qww-v76h");
  });

  it("loads GHSA-vc7v without hard-coded version ranges in the loader", async () => {
    const entry = await loadAdvisory("GHSA-vc7v-qv4w-wrv8", catalogRoot);

    expect(entry.id).toBe("GHSA-vc7v-qv4w-wrv8");
    expect(entry.affectedRange).toBe(">=16.2.0 <=16.4.4");
    expect(entry.fixturePatchedPin).toBe("16.4.5");
    expect(entry.fixtureVulnerablePin).toBe("16.3.0");
    expect(entry.url).toContain("GHSA-vc7v-qv4w-wrv8");
  });

  it("loads GHSA-rhh4 without hard-coded version ranges in the loader", async () => {
    const entry = await loadAdvisory("GHSA-rhh4-g77r-r9qj", catalogRoot);

    expect(entry.id).toBe("GHSA-rhh4-g77r-r9qj");
    expect(entry.affectedRange).toBe(">=16.0.0 <=16.4.4");
    expect(entry.fixturePatchedPin).toBe("16.4.5");
    expect(entry.fixtureVulnerablePin).toBe("16.3.0");
    expect(entry.url).toContain("GHSA-rhh4-g77r-r9qj");
  });

  it("loads GHSA-vvgp without hard-coded version ranges in the loader", async () => {
    const entry = await loadAdvisory("GHSA-vvgp-ww4w-46vf", catalogRoot);

    expect(entry.id).toBe("GHSA-vvgp-ww4w-46vf");
    expect(entry.affectedRange).toBe(">=16.4.0 <=16.4.4");
    expect(entry.fixturePatchedPin).toBe("16.4.5");
    expect(entry.fixtureVulnerablePin).toBe("16.4.4");
    expect(entry.url).toContain("GHSA-vvgp-ww4w-46vf");
  });

  it("rejects malformed catalog JSON", async () => {
    await expect(loadAdvisory("does-not-exist", catalogRoot)).rejects.toThrow();
  });
});
