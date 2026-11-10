import { describe, expect, it, vi } from "vitest";

import {
  observeTenantSwap,
  runTenantSwap,
  warmTenantSwap,
} from "../../src/engine/tenant-swap.js";
import type { FixtureManifest } from "../../src/fixtures/manifest.js";

const manifest = {
  id: "tenant-swap-demo",
  advisory: "CUSTOM-tenant-swap",
  expected: "PASS",
  nextVersion: "16.4.5",
  cacheComponents: true,
  healthPath: "/nci/health",
  cachePolicy: "memory",
  scenario: {
    id: "tenant-swap-headers",
    procedure: "tenant-swap",
    path: "/app",
    contexts: [
      {
        id: "a",
        rootParams: {},
        sentinel: "TENANT_A",
        headers: { "x-tenant": "a" },
        cookies: { session: "a" },
        host: "a.example.test",
      },
      {
        id: "b",
        rootParams: {},
        sentinel: "TENANT_B",
        headers: { "x-tenant": "b" },
        host: "b.example.test",
      },
    ],
    oracle: {
      type: "excludes-other-tenants",
      warmContext: "a",
      observeContext: "b",
      acceptErrorWithoutForbidden: false,
    },
  },
} satisfies FixtureManifest;

describe("tenant-swap", () => {
  it("warms tenant A then observes tenant B with identity headers", async () => {
    const calls: Array<{ url: string; headers: HeadersInit | undefined }> = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), headers: init?.headers });
      if (String(input).includes("/app") && calls.length === 1) {
        return new Response("TENANT_A", { status: 200 });
      }
      return new Response("TENANT_B", { status: 200 });
    }) as unknown as typeof fetch;

    const result = await runTenantSwap(manifest, {
      baseUrl: "http://127.0.0.1:43110",
      fetchImpl,
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe("http://127.0.0.1:43110/app");
    expect(calls[1]?.url).toBe("http://127.0.0.1:43110/app");
    const warmHeaders = new Headers(calls[0]?.headers);
    expect(warmHeaders.get("x-tenant")).toBe("a");
    expect(warmHeaders.get("cookie")).toBe("session=a");
    expect(warmHeaders.get("host")).toBe("a.example.test");
    const observeHeaders = new Headers(calls[1]?.headers);
    expect(observeHeaders.get("x-tenant")).toBe("b");
    expect(observeHeaders.get("host")).toBe("b.example.test");
    expect(result.passed).toBe(true);
  });

  it("fails when observe body leaks the warm tenant sentinel", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response("TENANT_A leaked", { status: 200 });
    }) as unknown as typeof fetch;

    await warmTenantSwap(manifest, {
      baseUrl: "http://127.0.0.1:43110",
      fetchImpl,
    });
    const result = await observeTenantSwap(manifest, {
      baseUrl: "http://127.0.0.1:43110",
      fetchImpl,
    });
    expect(result.passed).toBe(false);
    expect(result.forbiddenSentinelsFound).toContain("TENANT_A");
  });
});
