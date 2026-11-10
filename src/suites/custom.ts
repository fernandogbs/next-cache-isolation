import { runFixture } from "../engine/run-fixture.js";
import type { FixtureRunResult } from "../engine/types.js";
import { writeJsonReport } from "../reporters/json.js";
import {
  buildSummary,
  exitCodeForSummary,
} from "../reporters/summary.js";
import { printTerminalReport } from "../reporters/terminal.js";
import type { SliceReport } from "../reporters/types.js";
import {
  loadCustomSuiteConfig,
  resolveConfigPath,
} from "../config/loader.js";

export async function runCustomSuite(options: {
  cwd?: string;
  configPath?: string;
  basePort?: number;
  toolVersion?: string;
}): Promise<{ report: SliceReport; exitCode: 0 | 1 | 2 | 3 }> {
  const cwd = options.cwd ?? process.cwd();
  const startedAt = new Date().toISOString();
  const configPath = resolveConfigPath(cwd, options.configPath);
  const resolved = await loadCustomSuiteConfig(configPath);
  const basePort = options.basePort ?? resolved.basePort ?? 43110;

  const fixtures: FixtureRunResult[] = [];
  for (const [index, entry] of resolved.fixtures.entries()) {
    const result = await runFixture({
      fixtureDirectory: entry.directory,
      port: basePort + index,
      ...(entry.manifest ? { manifest: entry.manifest } : {}),
    });
    fixtures.push(result);
  }

  const report: SliceReport = {
    toolVersion: options?.toolVersion ?? "0.2.0",
    suite: "custom",
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
