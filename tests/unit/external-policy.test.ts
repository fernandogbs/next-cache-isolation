import { describe, expect, it, vi } from "vitest";

import type { ExternalCacheAdapter } from "../../src/cache/types.js";
import { runExternalWarmObserve } from "../../src/engine/external-policy.js";

describe("runExternalWarmObserve", () => {
  it("resets before warm, restarts between warm and observe, resets in finally", async () => {
    const events: string[] = [];
    const adapter: ExternalCacheAdapter = {
      reset: async () => {
        events.push("reset");
      },
      dispose: async () => {
        events.push("dispose");
      },
    };

    const result = await runExternalWarmObserve({
      adapter,
      warm: async () => {
        events.push("warm");
      },
      restart: async () => {
        events.push("restart");
      },
      observe: async () => {
        events.push("observe");
        return { passed: true } as never;
      },
    });

    expect(result.passed).toBe(true);
    expect(events).toEqual([
      "reset",
      "warm",
      "restart",
      "observe",
      "reset",
      "dispose",
    ]);
  });

  it("still resets and disposes when warm throws", async () => {
    const events: string[] = [];
    const adapter: ExternalCacheAdapter = {
      reset: async () => {
        events.push("reset");
      },
      dispose: async () => {
        events.push("dispose");
      },
    };

    await expect(
      runExternalWarmObserve({
        adapter,
        warm: async () => {
          events.push("warm");
          throw new Error("warm failed");
        },
        restart: async () => {
          events.push("restart");
        },
        observe: async () => {
          events.push("observe");
          return { passed: true } as never;
        },
      }),
    ).rejects.toThrow(/warm failed/);

    expect(events).toEqual(["reset", "warm", "reset", "dispose"]);
  });
});
