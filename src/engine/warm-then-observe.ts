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

/**
 * memory policy: warm context A, then observe context B on the same process.
 * Never restarts the server between warm and observe.
 */
export async function runWarmThenObserve(
  manifest: FixtureManifest,
  deps: WarmThenObserveDeps,
): Promise<ReturnType<typeof evaluateBodySentinel>> {
  if (manifest.cachePolicy !== "memory") {
    throw new Error(`Unsupported cachePolicy: ${manifest.cachePolicy}`);
  }
  assertWarmThenObserve(manifest);

  const fetchImpl = deps.fetchImpl ?? fetch;
  const { scenario } = manifest;
  const warmCtx = contextById(scenario, scenario.oracle.warmContext);
  const observeCtx = contextById(scenario, scenario.oracle.observeContext);

  const warmUrl = new URL(
    interpolatePath(scenario.paths.warm, warmCtx.rootParams),
    deps.baseUrl,
  ).toString();
  const warm = await getText(fetchImpl, warmUrl);
  // Warm response seeds the poisoned outer entry; not the isolation oracle.
  void warm;

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
