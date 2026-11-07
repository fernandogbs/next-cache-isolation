import { describe, expect, it, vi } from "vitest";

import {
  observeWarmThenObserve,
  warmWarmThenObserve,
} from "../../src/engine/warm-then-observe.js";
import type { FixtureManifest } from "../../src/fixtures/manifest.js";

const manifest = {
  id: "ghsa-vvgp-vulnerable",
  advisory: "GHSA-vvgp-ww4w-46vf",
  expected: "FAIL",
  nextVersion: "16.4.4",
  cacheComponents: true,
  healthPath: "/nci/health",
  cachePolicy: "persistent",
  scenario: {
    id: "vvgp-poison-restart-observe",
    procedure: "warm-then-observe",
    rootParamName: "shell",
    contexts: [
      {
        id: "poison",
        rootParams: { shell: "poison" },
        sentinel: "NCI_VVGP_POISON",
      },
      {
        id: "healthy",
        rootParams: { shell: "healthy" },
        sentinel: "NCI_VVGP_foo",
      },
    ],
    paths: {
      warm: "/placeholder/c/baz/%5Bthree%5D",
      observe: "/placeholder/c/foo/x",
    },
    oracle: {
      type: "body-sentinel",
      warmContext: "poison",
      observeContext: "healthy",
      mustContain: "NCI_VVGP_foo",
      mustNotContain: [],
      acceptErrorWithoutForbidden: false,
    },
  },
} satisfies FixtureManifest;

describe("persistent warm/observe split", () => {
  it("warms and observes as separate phases for a restart boundary", async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("%5Bthree%5D") || url.includes("[three]")) {
        return new Response("poisoned", { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;

    await warmWarmThenObserve(manifest, {
      baseUrl: "http://127.0.0.1:43110",
      fetchImpl,
    });
    // Simulated restart: new fetchImpl session, same poisoned disk state.
    const result = await observeWarmThenObserve(manifest, {
      baseUrl: "http://127.0.0.1:43110",
      fetchImpl,
    });

    expect(calls).toEqual([
      "http://127.0.0.1:43110/placeholder/c/baz/%5Bthree%5D",
      "http://127.0.0.1:43110/placeholder/c/foo/x",
    ]);
    expect(result.passed).toBe(false);
    expect(result.statusCode).toBe(404);
  });
});
