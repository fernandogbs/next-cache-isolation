import { access } from "node:fs/promises";
import path from "node:path";

import { loadAdvisory } from "../catalog/loader.js";
import { loadFixtureManifest } from "../fixtures/loader.js";

import { loadCustomSuiteConfig, resolveConfigPath } from "./loader.js";

export type DoctorFinding = {
  level: "ok" | "warn" | "error";
  code: string;
  message: string;
};

export type DoctorReport = {
  findings: DoctorFinding[];
  exitCode: 0 | 1 | 2;
};

function nodeMajor(version: string): number {
  const match = /^v(\d+)/.exec(version);
  return match ? Number.parseInt(match[1]!, 10) : 0;
}

export async function runDoctor(options: {
  cwd?: string;
  configPath?: string;
}): Promise<DoctorReport> {
  const cwd = options.cwd ?? process.cwd();
  const findings: DoctorFinding[] = [];

  if (nodeMajor(process.version) < 22) {
    findings.push({
      level: "error",
      code: "node-engine",
      message: `Node.js ${process.version} is below required >=22`,
    });
  } else {
    findings.push({
      level: "ok",
      code: "node-engine",
      message: `Node.js ${process.version}`,
    });
  }

  const configPath = resolveConfigPath(cwd, options.configPath);
  let resolved;
  try {
    await access(configPath);
    resolved = await loadCustomSuiteConfig(configPath);
    findings.push({
      level: "ok",
      code: "config-parse",
      message: `Loaded ${path.relative(cwd, configPath) || configPath}`,
    });
  } catch (error) {
    findings.push({
      level: "error",
      code: "config-parse",
      message:
        error instanceof Error
          ? error.message
          : `Failed to load config at ${configPath}`,
    });
    return { findings, exitCode: 2 };
  }

  for (const fixtureDirectory of resolved.fixtureDirectories) {
    const rel = path.relative(cwd, fixtureDirectory) || fixtureDirectory;
    try {
      await access(fixtureDirectory);
      const manifest = await loadFixtureManifest(fixtureDirectory);
      findings.push({
        level: "ok",
        code: "fixture",
        message: `${rel} → ${manifest.id} (${manifest.advisory}, expect ${manifest.expected})`,
      });

      try {
        const advisory = await loadAdvisory(manifest.advisory);
        findings.push({
          level: "ok",
          code: "catalog-hint",
          message: `${manifest.advisory}: affected ${advisory.affectedRange}; fixture pins vuln=${advisory.fixtureVulnerablePin ?? "n/a"} patched=${advisory.fixturePatchedPin}`,
        });
      } catch {
        findings.push({
          level: "warn",
          code: "catalog-hint",
          message: `No catalog entry for ${manifest.advisory} (ok for custom-only advisories)`,
        });
      }
    } catch (error) {
      findings.push({
        level: "error",
        code: "fixture",
        message: `${rel}: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  const hasError = findings.some((item) => item.level === "error");
  return {
    findings,
    exitCode: hasError ? 1 : 0,
  };
}

export function printDoctorReport(report: DoctorReport): void {
  console.log("NEXT CACHE ISOLATION DOCTOR");
  console.log("");
  for (const finding of report.findings) {
    const tag = finding.level.toUpperCase().padEnd(5);
    console.log(`  [${tag}] ${finding.code}: ${finding.message}`);
  }
  console.log("");
  console.log(
    report.exitCode === 0
      ? "RESULT: healthy"
      : `RESULT: problems (exit ${report.exitCode})`,
  );
}
