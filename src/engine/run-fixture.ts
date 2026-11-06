import path from "node:path";

import { loadFixtureManifest } from "../fixtures/loader.js";
import { NextProcessManager } from "../process/index.js";

import { runMemoryRace } from "./memory-race.js";
import type { FixtureRunResult } from "./types.js";
import { runWarmThenObserve } from "./warm-then-observe.js";

export type RunFixtureOptions = {
  fixtureDirectory: string;
  port: number;
};

export async function runFixture(
  options: RunFixtureOptions,
): Promise<FixtureRunResult> {
  const manifest = await loadFixtureManifest(options.fixtureDirectory);
  const nextBin = path.join(
    options.fixtureDirectory,
    "node_modules/.bin/next",
  );

  if (manifest.cachePolicy !== "memory") {
    return {
      id: manifest.id,
      advisory: manifest.advisory,
      scenarioId: manifest.scenario.id,
      nextVersion: manifest.nextVersion,
      buildId: null,
      cachePolicy: manifest.cachePolicy,
      expected: manifest.expected,
      actual: "SKIP",
      skipReason: `cachePolicy ${manifest.cachePolicy} not implemented`,
    };
  }

  const manager = new NextProcessManager({
    directory: options.fixtureDirectory,
    port: options.port,
    healthPath: manifest.healthPath,
    buildCommand: ["npm", "run", "build"],
    startCommand: [
      nextBin,
      "start",
      "-p",
      String(options.port),
      "-H",
      "127.0.0.1",
    ],
    startupTimeoutMs: 180_000,
  });

  try {
    const build = await manager.build();
    const server = await manager.start();
    const oracle =
      manifest.scenario.procedure === "warm-then-observe"
        ? await runWarmThenObserve(manifest, { baseUrl: server.baseUrl })
        : manifest.scenario.procedure === "cold-fill-race"
          ? await runMemoryRace(manifest, { baseUrl: server.baseUrl })
          : (() => {
              const _exhaustive: never = manifest.scenario;
              throw new Error(
                `Unsupported procedure: ${(_exhaustive as { procedure: string }).procedure}`,
              );
            })();
    const actual = oracle.passed ? "PASS" : "FAIL";

    return {
      id: manifest.id,
      advisory: manifest.advisory,
      scenarioId: manifest.scenario.id,
      nextVersion: manifest.nextVersion,
      buildId: build.buildId,
      cachePolicy: "memory",
      expected: manifest.expected,
      actual,
      oracle,
    };
  } catch (error) {
    return {
      id: manifest.id,
      advisory: manifest.advisory,
      scenarioId: manifest.scenario.id,
      nextVersion: manifest.nextVersion,
      buildId: manager.buildId,
      cachePolicy: "memory",
      expected: manifest.expected,
      actual: "ERROR",
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await manager.stop();
  }
}
