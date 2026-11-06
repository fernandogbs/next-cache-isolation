import { describe, expect, it } from "vitest";

import {
  buildSummary,
  exitCodeForSummary,
} from "../../src/reporters/summary.js";
import type { FixtureRunResult } from "../../src/engine/types.js";

function fixture(
  partial: Partial<FixtureRunResult> &
    Pick<FixtureRunResult, "actual" | "expected">,
): FixtureRunResult {
  return {
    id: "x",
    advisory: "GHSA-mfr8-8qww-v76h",
    scenarioId: "mfr8-cold-fill-race",
    nextVersion: "16.4.2",
    buildId: "abc",
    cachePolicy: "memory",
    ...partial,
  };
}

describe("tool-repo exit codes", () => {
  it("returns 0 when runnable fixtures match expected", () => {
    const summary = buildSummary([
      fixture({ expected: "FAIL", actual: "FAIL" }),
      fixture({ expected: "PASS", actual: "PASS" }),
    ]);
    expect(exitCodeForSummary(summary)).toBe(0);
  });

  it("returns 1 on mismatch without errors", () => {
    const summary = buildSummary([
      fixture({ expected: "FAIL", actual: "PASS" }),
    ]);
    expect(exitCodeForSummary(summary)).toBe(1);
  });

  it("returns 2 when any fixture errors", () => {
    const summary = buildSummary([
      fixture({ expected: "FAIL", actual: "FAIL" }),
      fixture({ expected: "PASS", actual: "ERROR", errorMessage: "boom" }),
    ]);
    expect(exitCodeForSummary(summary)).toBe(2);
  });

  it("returns 3 when nothing matched (all skip)", () => {
    const summary = buildSummary([
      fixture({ expected: "FAIL", actual: "SKIP", skipReason: "n/a" }),
    ]);
    expect(exitCodeForSummary(summary)).toBe(3);
  });
});
