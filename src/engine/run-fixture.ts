import path from "node:path";

import { loadFixtureManifest } from "../fixtures/loader.js";
import { NextProcessManager } from "../process/index.js";

import { runMemoryRace } from "./memory-race.js";
import type { FixtureRunResult } from "./types.js";
import {
  observeWarmThenObserve,
  runWarmThenObserve,
  warmWarmThenObserve,
} from "./warm-then-observe.js";

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

  if (
    manifest.cachePolicy !== "memory" &&
    manifest.cachePolicy !== "persistent"
  ) {
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

    const oracle = await (async () => {
      switch (manifest.scenario.procedure) {
        case "warm-then-observe": {
          if (manifest.cachePolicy === "memory") {
            const server = await manager.start();
            return runWarmThenObserve(manifest, { baseUrl: server.baseUrl });
          }
          // persistent: poison, restart same .next (no rebuild), then observe.
          const warmServer = await manager.start();
          await warmWarmThenObserve(manifest, {
            baseUrl: warmServer.baseUrl,
          });
          await manager.stop();
          const observeServer = await manager.start();
          return observeWarmThenObserve(manifest, {
            baseUrl: observeServer.baseUrl,
          });
        }
        case "cold-fill-race": {
          if (manifest.cachePolicy !== "memory") {
            throw new Error(
              `cold-fill-race requires cachePolicy memory, got ${manifest.cachePolicy}`,
            );
          }
          const server = await manager.start();
          return runMemoryRace(manifest, { baseUrl: server.baseUrl });
        }
        default: {
          const _exhaustive: never = manifest.scenario;
          throw new Error(
            `Unsupported procedure: ${(_exhaustive as { procedure: string }).procedure}`,
          );
        }
      }
    })();

    const actual = oracle.passed ? "PASS" : "FAIL";

    return {
      id: manifest.id,
      advisory: manifest.advisory,
      scenarioId: manifest.scenario.id,
      nextVersion: manifest.nextVersion,
      buildId: build.buildId,
      cachePolicy: manifest.cachePolicy,
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
      cachePolicy: manifest.cachePolicy,
      expected: manifest.expected,
      actual: "ERROR",
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await manager.stop();
  }
}
