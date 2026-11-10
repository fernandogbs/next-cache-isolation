import { describe, expect, it, vi } from "vitest";

import { observeWarmThenObserve } from "../../src/engine/warm-then-observe.js";
import type { FixtureManifest } from "../../src/fixtures/manifest.js";

const manifest = {
  id: "flight-demo",
  advisory: "CUSTOM-flight",
  expected: "PASS",
  nextVersion: "16.4.5",
  cacheComponents: true,
  healthPath: "/nci/health",
  cachePolicy: "memory",
  scenario: {
    id: "flight-warm-observe",
    procedure: "warm-then-observe",
    rootParamName: "locale",
    contexts: [
      {
        id: "pt",
        rootParams: { locale: "pt-BR" },
        sentinel: "NCI_FLIGHT_PT",
      },
      {
        id: "en",
        rootParams: { locale: "en-US" },
        sentinel: "NCI_FLIGHT_EN",
      },
    ],
    paths: {
      warm: "/{locale}/nested",
      observe: "/{locale}/nested",
    },
    oracle: {
      type: "flight-sentinel",
      warmContext: "pt",
      observeContext: "en",
      mustContain: "NCI_FLIGHT_EN",
      mustNotContain: ["NCI_FLIGHT_PT"],
      acceptErrorWithoutForbidden: false,
    },
  },
} satisfies FixtureManifest;

describe("flight-sentinel observe headers", () => {
  it("sends RSC: 1 and Accept text/x-component on observe", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Response('0:"NCI_FLIGHT_EN"', { status: 200 });
    }) as unknown as typeof fetch;

    const result = await observeWarmThenObserve(manifest, {
      baseUrl: "http://127.0.0.1:43110",
      fetchImpl,
    });

    expect(result.passed).toBe(true);
    const headers = new Headers(
      (fetchImpl.mock.calls[0] as unknown as [unknown, RequestInit])[1]
        ?.headers,
    );
    expect(headers.get("RSC")).toBe("1");
    expect(headers.get("Accept")).toBe("text/x-component");
  });
});
