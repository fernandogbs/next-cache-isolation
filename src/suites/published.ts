import path from "node:path";
import { fileURLToPath } from "node:url";

import { runFixture } from "../engine/run-fixture.js";
import type { FixtureRunResult } from "../engine/types.js";
import { writeJsonReport } from "../reporters/json.js";
import {
  buildSummary,
  exitCodeForSummary,
} from "../reporters/summary.js";
import { printTerminalReport } from "../reporters/terminal.js";
import type { SliceReport } from "../reporters/types.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function repoRoot(): string {
  return path.resolve(moduleDir, "../..");
}

const PUBLISHED_FIXTURES = [
  "fixtures/ghsa-mfr8-vulnerable",
  "fixtures/ghsa-mfr8-patched",
  "fixtures/ghsa-vc7v-vulnerable",
  "fixtures/ghsa-vc7v-patched",
  "fixtures/ghsa-rhh4-vulnerable",
  "fixtures/ghsa-rhh4-patched",
  "fixtures/ghsa-vvgp-vulnerable",
  "fixtures/ghsa-vvgp-patched",
] as const;

export async function runPublishedSuite(options?: {
  basePort?: number;
  toolVersion?: string;
}): Promise<{ report: SliceReport; exitCode: 0 | 1 | 2 | 3 }> {
  const startedAt = new Date().toISOString();
  const basePort = options?.basePort ?? 43110;
  const root = repoRoot();

  const fixtures: FixtureRunResult[] = [];
  for (const [index, relative] of PUBLISHED_FIXTURES.entries()) {
    const result = await runFixture({
      fixtureDirectory: path.join(root, relative),
      port: basePort + index,
    });
    fixtures.push(result);
  }

  const report: SliceReport = {
    toolVersion: options?.toolVersion ?? "0.2.0",
    suite: "published",
    nodeVersion: process.version,
    startedAt,
    completedAt: new Date().toISOString(),
    fixtures,
    summary: buildSummary(fixtures),
  };

  const reportPath = await writeJsonReport(report);
  printTerminalReport(report);
  console.log("");
  console.log(`Report: ${reportPath}`);

  return { report, exitCode: exitCodeForSummary(report.summary) };
}
