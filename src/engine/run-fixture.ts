import path from "node:path";

import { createRedisAdapterFromEnv } from "../cache/redis-adapter.js";
import type { ExternalCacheAdapter } from "../cache/types.js";
import { loadFixtureManifest } from "../fixtures/loader.js";
import type { FixtureManifest } from "../fixtures/manifest.js";
import { NextProcessManager } from "../process/index.js";
import type { OracleResult } from "../validators/body-sentinel.js";

import { runExternalWarmObserve } from "./external-policy.js";
import { runMemoryRace } from "./memory-race.js";
import type { FixtureRunResult } from "./types.js";
import {
  observeTenantSwap,
  runTenantSwap,
  warmTenantSwap,
} from "./tenant-swap.js";
import {
  observeWarmThenObserve,
  runWarmThenObserve,
  warmWarmThenObserve,
} from "./warm-then-observe.js";

export type RunFixtureOptions = {
  fixtureDirectory: string;
  port: number;
  /** When set (inline YAML), skip reading nci.fixture.json. */
  manifest?: FixtureManifest;
  /** Injected in tests; production builds Redis from externalCache. */
  externalAdapter?: ExternalCacheAdapter;
};

function resolveExternalAdapter(
  manifest: FixtureManifest,
  injected?: ExternalCacheAdapter,
): ExternalCacheAdapter {
  if (injected) {
    return injected;
  }
  if (!manifest.externalCache) {
    throw new Error(
      `Fixture ${manifest.id} has cachePolicy external but no externalCache config`,
    );
  }
  return createRedisAdapterFromEnv({
    urlEnv: manifest.externalCache.urlEnv,
    keyPrefix: manifest.externalCache.keyPrefix,
  });
}

async function runScenarioOracle(
  manifest: FixtureManifest,
  manager: NextProcessManager,
  externalAdapter?: ExternalCacheAdapter,
): Promise<OracleResult> {
  switch (manifest.scenario.procedure) {
    case "warm-then-observe": {
      if (manifest.cachePolicy === "memory") {
        const server = await manager.start();
        return runWarmThenObserve(manifest, { baseUrl: server.baseUrl });
      }
      if (manifest.cachePolicy === "persistent") {
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
      return runExternalWarmObserve({
        adapter: resolveExternalAdapter(manifest, externalAdapter),
        warm: async () => {
          const warmServer = await manager.start();
          await warmWarmThenObserve(manifest, {
            baseUrl: warmServer.baseUrl,
          });
        },
        restart: async () => {
          await manager.stop();
          await manager.start();
        },
        observe: async () => {
          const baseUrl = manager.baseUrl;
          if (!baseUrl) {
            throw new Error("Server not running for external observe");
          }
          return observeWarmThenObserve(manifest, { baseUrl });
        },
      });
    }
    case "tenant-swap": {
      if (manifest.cachePolicy === "memory") {
        const server = await manager.start();
        return runTenantSwap(manifest, { baseUrl: server.baseUrl });
      }
      if (manifest.cachePolicy === "persistent") {
        const warmServer = await manager.start();
        await warmTenantSwap(manifest, { baseUrl: warmServer.baseUrl });
        await manager.stop();
        const observeServer = await manager.start();
        return observeTenantSwap(manifest, {
          baseUrl: observeServer.baseUrl,
        });
      }
      return runExternalWarmObserve({
        adapter: resolveExternalAdapter(manifest, externalAdapter),
        warm: async () => {
          const warmServer = await manager.start();
          await warmTenantSwap(manifest, { baseUrl: warmServer.baseUrl });
        },
        restart: async () => {
          await manager.stop();
          await manager.start();
        },
        observe: async () => {
          const baseUrl = manager.baseUrl;
          if (!baseUrl) {
            throw new Error("Server not running for external observe");
          }
          return observeTenantSwap(manifest, { baseUrl });
        },
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
}

export async function runFixture(
  options: RunFixtureOptions,
): Promise<FixtureRunResult> {
  const manifest =
    options.manifest ?? (await loadFixtureManifest(options.fixtureDirectory));
  const nextBin = path.join(
    options.fixtureDirectory,
    "node_modules/.bin/next",
  );

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
    const oracle = await runScenarioOracle(
      manifest,
      manager,
      options.externalAdapter,
    );
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
