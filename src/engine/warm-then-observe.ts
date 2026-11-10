import { interpolatePath } from "../fixtures/loader.js";
import type {
  FixtureManifest,
  WarmThenObserveScenario,
} from "../fixtures/manifest.js";
import type { OracleResult } from "../validators/body-sentinel.js";

import { requestText } from "./http.js";
import {
  evaluateIsolationOracle,
  RSC_OBSERVE_HEADERS,
  resolveOracleMarkers,
} from "./oracle.js";

export type WarmThenObserveDeps = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

function assertWarmThenObserve(
  manifest: FixtureManifest,
): asserts manifest is FixtureManifest & {
  scenario: WarmThenObserveScenario;
} {
  if (manifest.scenario.procedure !== "warm-then-observe") {
    throw new Error(
      `runWarmThenObserve requires procedure warm-then-observe, got ${manifest.scenario.procedure}`,
    );
  }
}

function contextById(scenario: WarmThenObserveScenario, id: string) {
  const ctx = scenario.contexts.find((item) => item.id === id);
  if (!ctx) {
    throw new Error(`Unknown context id: ${id}`);
  }
  return ctx;
}

/** Seeds / poisons the shared entry; response is not the isolation oracle. */
export async function warmWarmThenObserve(
  manifest: FixtureManifest,
  deps: WarmThenObserveDeps,
): Promise<void> {
  assertWarmThenObserve(manifest);
  const { scenario } = manifest;
  const warmCtx = contextById(scenario, scenario.oracle.warmContext);
  const warmUrl = new URL(
    interpolatePath(scenario.paths.warm, warmCtx.rootParams),
    deps.baseUrl,
  ).toString();
  await requestText({
    url: warmUrl,
    context: warmCtx,
    ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
  });
}

/** Isolation oracle against the observe context. */
export async function observeWarmThenObserve(
  manifest: FixtureManifest,
  deps: WarmThenObserveDeps,
): Promise<OracleResult> {
  assertWarmThenObserve(manifest);
  const { scenario } = manifest;
  const observeCtx = contextById(scenario, scenario.oracle.observeContext);
  const observeUrl = new URL(
    interpolatePath(scenario.paths.observe, observeCtx.rootParams),
    deps.baseUrl,
  ).toString();
  const markers = resolveOracleMarkers(scenario.oracle, scenario.contexts);
  const observe = await requestText({
    url: observeUrl,
    context: observeCtx,
    headers:
      markers.kind === "flight-sentinel" ? { ...RSC_OBSERVE_HEADERS } : {},
    ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
  });

  return evaluateIsolationOracle({
    oracle: scenario.oracle,
    contexts: scenario.contexts,
    statusCode: observe.status,
    body: observe.body,
    durationMs: observe.durationMs,
  });
}

/**
 * memory policy: warm then observe on the same process (no restart).
 * For persistent, call warmWarmThenObserve / observeWarmThenObserve around a restart.
 */
export async function runWarmThenObserve(
  manifest: FixtureManifest,
  deps: WarmThenObserveDeps,
): Promise<OracleResult> {
  if (manifest.cachePolicy !== "memory") {
    throw new Error(
      `runWarmThenObserve is memory-only; use split warm/observe for ${manifest.cachePolicy}`,
    );
  }
  await warmWarmThenObserve(manifest, deps);
  return observeWarmThenObserve(manifest, deps);
}
