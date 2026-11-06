import type { OracleResult } from "../validators/body-sentinel.js";

export type ScenarioActual = "PASS" | "FAIL" | "SKIP" | "ERROR";

export type FixtureRunResult = {
  id: string;
  advisory: string;
  scenarioId: string;
  nextVersion: string;
  buildId: string | null;
  cachePolicy: "memory" | "persistent" | "external";
  expected: "PASS" | "FAIL";
  actual: ScenarioActual;
  skipReason?: string;
  errorMessage?: string;
  oracle?: OracleResult;
};
