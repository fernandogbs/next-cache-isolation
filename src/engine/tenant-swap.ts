import type {
  FixtureManifest,
  TenantSwapScenario,
} from "../fixtures/manifest.js";
import type { OracleResult } from "../validators/body-sentinel.js";

import { requestText } from "./http.js";
import {
  evaluateIsolationOracle,
  RSC_OBSERVE_HEADERS,
  resolveOracleMarkers,
} from "./oracle.js";

export type TenantSwapDeps = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

function assertTenantSwap(
  manifest: FixtureManifest,
): asserts manifest is FixtureManifest & { scenario: TenantSwapScenario } {
  if (manifest.scenario.procedure !== "tenant-swap") {
    throw new Error(
      `runTenantSwap requires procedure tenant-swap, got ${manifest.scenario.procedure}`,
    );
  }
}

function contextById(scenario: TenantSwapScenario, id: string) {
  const ctx = scenario.contexts.find((item) => item.id === id);
  if (!ctx) {
    throw new Error(`Unknown context id: ${id}`);
  }
  return ctx;
}

export async function warmTenantSwap(
  manifest: FixtureManifest,
  deps: TenantSwapDeps,
): Promise<void> {
  assertTenantSwap(manifest);
  const { scenario } = manifest;
  const warmCtx = contextById(scenario, scenario.oracle.warmContext);
  const warmUrl = new URL(scenario.path, deps.baseUrl).toString();
  await requestText({
    url: warmUrl,
    context: warmCtx,
    ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
  });
}

export async function observeTenantSwap(
  manifest: FixtureManifest,
  deps: TenantSwapDeps,
): Promise<OracleResult> {
  assertTenantSwap(manifest);
  const { scenario } = manifest;
  const observeCtx = contextById(scenario, scenario.oracle.observeContext);
  const observeUrl = new URL(scenario.path, deps.baseUrl).toString();
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

export async function runTenantSwap(
  manifest: FixtureManifest,
  deps: TenantSwapDeps,
): Promise<OracleResult> {
  if (manifest.cachePolicy !== "memory") {
    throw new Error(
      `runTenantSwap is memory-only; use split warm/observe for ${manifest.cachePolicy}`,
    );
  }
  await warmTenantSwap(manifest, deps);
  return observeTenantSwap(manifest, deps);
}
