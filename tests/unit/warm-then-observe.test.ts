import { describe, expect, it, vi } from "vitest";

import { runWarmThenObserve } from "../../src/engine/warm-then-observe.js";
import type { FixtureManifest } from "../../src/fixtures/manifest.js";

const manifest = {
  id: "ghsa-vc7v-vulnerable",
  advisory: "GHSA-vc7v-qv4w-wrv8",
  expected: "FAIL",
  nextVersion: "16.3.0",
  cacheComponents: true,
  healthPath: "/nci/health",
  cachePolicy: "memory",
  scenario: {
    id: "vc7v-warm-then-observe",
    procedure: "warm-then-observe",
    rootParamName: "locale",
    contexts: [
      {
        id: "pt",
        rootParams: { locale: "pt-BR" },
        sentinel: "NCI_VC7V_PT_BR",
      },
      {
        id: "en",
        rootParams: { locale: "en-US" },
        sentinel: "NCI_VC7V_EN_US",
      },
    ],
    paths: {
      warm: "/{locale}/nested",
      observe: "/{locale}/nested",
    },
    oracle: {
      type: "body-sentinel",
      warmContext: "pt",
      observeContext: "en",
      mustContain: "NCI_VC7V_EN_US",
      mustNotContain: ["NCI_VC7V_PT_BR"],
      acceptErrorWithoutForbidden: false,
    },
  },
} satisfies FixtureManifest;

describe("runWarmThenObserve", () => {
  it("warms then observes on one process without restart", async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("pt-BR")) {
        return new Response("<p id=\"marker\">NCI_VC7V_PT_BR</p>", {
          status: 200,
        });
      }
      return new Response("<p id=\"marker\">NCI_VC7V_PT_BR</p>", {
        status: 200,
      });
    }) as unknown as typeof fetch;

    const result = await runWarmThenObserve(manifest, {
      baseUrl: "http://127.0.0.1:43110",
      fetchImpl,
    });

    expect(calls).toEqual([
      "http://127.0.0.1:43110/pt-BR/nested",
      "http://127.0.0.1:43110/en-US/nested",
    ]);
    expect(result.passed).toBe(false);
    expect(result.reason).toMatch(/forbidden|mustNotContain|NCI_VC7V_PT_BR/i);
  });

  it("passes when observe body is isolated", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("pt-BR")) {
        return new Response("<p id=\"marker\">NCI_VC7V_PT_BR</p>", {
          status: 200,
        });
      }
      return new Response("<p id=\"marker\">NCI_VC7V_EN_US</p>", {
        status: 200,
      });
    }) as unknown as typeof fetch;

    const result = await runWarmThenObserve(manifest, {
      baseUrl: "http://127.0.0.1:43110",
      fetchImpl,
    });

    expect(result.passed).toBe(true);
  });
});
