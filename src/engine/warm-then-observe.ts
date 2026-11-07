import { interpolatePath } from "../fixtures/loader.js";
import type {
  FixtureManifest,
  WarmThenObserveScenario,
} from "../fixtures/manifest.js";
import { evaluateBodySentinel } from "../validators/body-sentinel.js";

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

async function getText(
  fetchImpl: typeof fetch,
  url: string,
): Promise<{ status: number; body: string; durationMs: number }> {
  const started = Date.now();
  const response = await fetchImpl(url, {
    method: "GET",
    redirect: "manual",
  });
  const body = await response.text();
  return {
    status: response.status,
    body,
    durationMs: Date.now() - started,
  };
}

/** Seeds / poisons the shared entry; response is not the isolation oracle. */
export async function warmWarmThenObserve(
  manifest: FixtureManifest,
  deps: WarmThenObserveDeps,
): Promise<void> {
  assertWarmThenObserve(manifest);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const { scenario } = manifest;
  const warmCtx = contextById(scenario, scenario.oracle.warmContext);
  const warmUrl = new URL(
    interpolatePath(scenario.paths.warm, warmCtx.rootParams),
    deps.baseUrl,
  ).toString();
  await getText(fetchImpl, warmUrl);
}

/** Isolation oracle against the observe context. */
export async function observeWarmThenObserve(
  manifest: FixtureManifest,
  deps: WarmThenObserveDeps,
): Promise<ReturnType<typeof evaluateBodySentinel>> {
  assertWarmThenObserve(manifest);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const { scenario } = manifest;
  const observeCtx = contextById(scenario, scenario.oracle.observeContext);
  const observeUrl = new URL(
    interpolatePath(scenario.paths.observe, observeCtx.rootParams),
    deps.baseUrl,
  ).toString();
  const observe = await getText(fetchImpl, observeUrl);

  return evaluateBodySentinel(
    {
      statusCode: observe.status,
      body: observe.body,
      mustContain: scenario.oracle.mustContain,
      mustNotContain: scenario.oracle.mustNotContain,
      acceptErrorWithoutForbidden:
        scenario.oracle.acceptErrorWithoutForbidden,
    },
    observe.durationMs,
  );
}

/**
 * memory policy: warm then observe on the same process (no restart).
 * For persistent, call warmWarmThenObserve / observeWarmThenObserve around a restart.
 */
export async function runWarmThenObserve(
  manifest: FixtureManifest,
  deps: WarmThenObserveDeps,
): Promise<ReturnType<typeof evaluateBodySentinel>> {
  if (manifest.cachePolicy !== "memory") {
    throw new Error(
      `runWarmThenObserve is memory-only; use split warm/observe for ${manifest.cachePolicy}`,
    );
  }
  await warmWarmThenObserve(manifest, deps);
  return observeWarmThenObserve(manifest, deps);
}
