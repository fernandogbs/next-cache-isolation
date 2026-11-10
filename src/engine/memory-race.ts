import { interpolatePath } from "../fixtures/loader.js";
import type {
  ColdFillRaceScenario,
  FixtureManifest,
} from "../fixtures/manifest.js";
import type { OracleResult } from "../validators/body-sentinel.js";

import { requestText } from "./http.js";
import { evaluateIsolationOracle } from "./oracle.js";

export type MemoryRaceDeps = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

function assertColdFillRace(
  manifest: FixtureManifest,
): asserts manifest is FixtureManifest & { scenario: ColdFillRaceScenario } {
  if (manifest.scenario.procedure !== "cold-fill-race") {
    throw new Error(
      `runMemoryRace requires procedure cold-fill-race, got ${manifest.scenario.procedure}`,
    );
  }
}

function contextById(scenario: ColdFillRaceScenario, id: string) {
  const ctx = scenario.contexts.find((item) => item.id === id);
  if (!ctx) {
    throw new Error(`Unknown context id: ${id}`);
  }
  return ctx;
}

/**
 * memory policy: arm latch → race direct+unstable → observe same process.
 * Never restarts the server between race and observe.
 */
export async function runMemoryRace(
  manifest: FixtureManifest,
  deps: MemoryRaceDeps,
): Promise<OracleResult> {
  if (manifest.cachePolicy !== "memory") {
    throw new Error(`Unsupported cachePolicy: ${manifest.cachePolicy}`);
  }
  assertColdFillRace(manifest);

  const { scenario } = manifest;
  const directCtx = contextById(scenario, scenario.oracle.raceDirectContext);
  const unstableCtx = contextById(
    scenario,
    scenario.oracle.raceUnstableContext,
  );
  const observeCtx = contextById(scenario, scenario.oracle.observeContext);
  const fetchOpts = deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {};

  if (scenario.latch.enabled) {
    const armUrl = new URL(scenario.latch.armPath, deps.baseUrl).toString();
    const armResponse = await requestText({
      url: armUrl,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ holdMs: scenario.latch.holdMs }),
      ...fetchOpts,
    });
    if (armResponse.status < 200 || armResponse.status >= 300) {
      throw new Error(`Failed to arm latch: ${armResponse.status}`);
    }
  }

  const directUrl = new URL(
    interpolatePath(scenario.paths.direct, directCtx.rootParams),
    deps.baseUrl,
  ).toString();
  const unstableUrl = new URL(
    interpolatePath(scenario.paths.unstable, unstableCtx.rootParams),
    deps.baseUrl,
  ).toString();

  const race = await Promise.all([
    requestText({ url: directUrl, context: directCtx, ...fetchOpts }),
    requestText({ url: unstableUrl, context: unstableCtx, ...fetchOpts }),
  ]);

  if (scenario.latch.enabled) {
    const releaseUrl = new URL(
      scenario.latch.releasePath,
      deps.baseUrl,
    ).toString();
    await requestText({
      url: releaseUrl,
      method: "POST",
      ...fetchOpts,
    }).catch(() => undefined);
  }

  // Instrumentation only — do not use race bodies as the isolation oracle.
  void race;

  const observeUrl = new URL(
    interpolatePath(scenario.paths.observe, observeCtx.rootParams),
    deps.baseUrl,
  ).toString();
  const observe = await requestText({
    url: observeUrl,
    context: observeCtx,
    ...fetchOpts,
  });

  return evaluateIsolationOracle({
    oracle: scenario.oracle,
    contexts: scenario.contexts,
    statusCode: observe.status,
    body: observe.body,
    durationMs: observe.durationMs,
  });
}
