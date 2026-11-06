import type { FixtureRunResult } from "../engine/types.js";

import type { SliceReport } from "./types.js";

export function buildSummary(
  fixtures: FixtureRunResult[],
): SliceReport["summary"] {
  let matched = 0;
  let mismatched = 0;
  let skipped = 0;
  let errors = 0;

  for (const fixture of fixtures) {
    switch (fixture.actual) {
      case "SKIP":
        skipped += 1;
        break;
      case "ERROR":
        errors += 1;
        break;
      case "PASS":
      case "FAIL":
        if (fixture.actual === fixture.expected) {
          matched += 1;
        } else {
          mismatched += 1;
        }
        break;
      default: {
        const _exhaustive: never = fixture.actual;
        void _exhaustive;
        errors += 1;
      }
    }
  }

  return {
    total: fixtures.length,
    matched,
    mismatched,
    skipped,
    errors,
  };
}

/** Tool-repo CI exit codes: priority 2 > 1 > 3 > 0 */
export function exitCodeForSummary(
  summary: SliceReport["summary"],
): 0 | 1 | 2 | 3 {
  if (summary.errors > 0) {
    return 2;
  }
  if (summary.mismatched > 0) {
    return 1;
  }
  if (summary.total === 0 || summary.matched === 0) {
    return 3;
  }
  return 0;
}
