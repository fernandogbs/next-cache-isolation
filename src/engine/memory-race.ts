import { interpolatePath } from "../fixtures/loader.js";
import type {
  ColdFillRaceScenario,
  FixtureManifest,
} from "../fixtures/manifest.js";
import { evaluateBodySentinel } from "../validators/body-sentinel.js";

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
 * memory policy: arm latch → race direct+unstable → observe same process.
 * Never restarts the server between race and observe.
 */
export async function runMemoryRace(
  manifest: FixtureManifest,
  deps: MemoryRaceDeps,
): Promise<ReturnType<typeof evaluateBodySentinel>> {
  if (manifest.cachePolicy !== "memory") {
    throw new Error(`Unsupported cachePolicy: ${manifest.cachePolicy}`);
  }
  assertColdFillRace(manifest);

  const fetchImpl = deps.fetchImpl ?? fetch;
  const { scenario } = manifest;
  const directCtx = contextById(scenario, scenario.oracle.raceDirectContext);
  const unstableCtx = contextById(
    scenario,
    scenario.oracle.raceUnstableContext,
  );
  const observeCtx = contextById(scenario, scenario.oracle.observeContext);

  if (scenario.latch.enabled) {
    const armUrl = new URL(scenario.latch.armPath, deps.baseUrl);
    const armResponse = await fetchImpl(armUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ holdMs: scenario.latch.holdMs }),
    });
    if (!armResponse.ok) {
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
    getText(fetchImpl, directUrl),
    getText(fetchImpl, unstableUrl),
  ]);

  if (scenario.latch.enabled) {
    const releaseUrl = new URL(scenario.latch.releasePath, deps.baseUrl);
    await fetchImpl(releaseUrl, { method: "POST" }).catch(() => undefined);
  }

  // Instrumentation only — do not use race bodies as the isolation oracle.
  void race;

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
