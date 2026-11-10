import { describe, expect, it, vi } from "vitest";

import {
  createRedisExternalCacheAdapter,
  type RedisLikeClient,
} from "../../src/cache/redis-adapter.js";

describe("createRedisExternalCacheAdapter", () => {
  it("SCAN+DEL keys under prefix and never FLUSHDB", async () => {
    const del = vi.fn(async () => 2);
    const scan = vi
      .fn()
      .mockResolvedValueOnce(["10", ["nci:a", "nci:b"]])
      .mockResolvedValueOnce(["0", []]);
    const quit = vi.fn(async () => "OK");
    const connect = vi.fn(async () => undefined);

    const client: RedisLikeClient = {
      connect,
      quit,
      scan,
      del,
      flushDb: vi.fn(async () => {
        throw new Error("FLUSHDB must not be called");
      }),
    };

    const adapter = createRedisExternalCacheAdapter({
      client,
      keyPrefix: "nci:",
    });

    await adapter.reset();
    await adapter.dispose();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(scan).toHaveBeenCalledWith("0", { MATCH: "nci:*", COUNT: 100 });
    expect(del).toHaveBeenCalledWith(["nci:a", "nci:b"]);
    expect(client.flushDb).not.toHaveBeenCalled();
    expect(quit).toHaveBeenCalledTimes(1);
  });

  it("skips DEL when a scan page is empty", async () => {
    const del = vi.fn(async () => 0);
    const client: RedisLikeClient = {
      connect: vi.fn(async () => undefined),
      quit: vi.fn(async () => "OK"),
      scan: vi.fn().mockResolvedValue(["0", []]),
      del,
    };

    const adapter = createRedisExternalCacheAdapter({
      client,
      keyPrefix: "nci:",
    });
    await adapter.reset();
    expect(del).not.toHaveBeenCalled();
  });
});

describe("external redis integration", () => {
  it.skipIf(!process.env.NCI_REDIS_URL)(
    "resets keys under prefix against a live Redis",
    async () => {
      const { createClient } = await import("redis");
      const url = process.env.NCI_REDIS_URL!;
      const client = createClient({ url });
      await client.connect();
      try {
        await client.set("nci:test-key", "1");
        const adapter = createRedisExternalCacheAdapter({
          url,
          keyPrefix: "nci:",
        });
        await adapter.reset();
        expect(await client.exists("nci:test-key")).toBe(0);
        await adapter.dispose();
      } finally {
        await client.quit();
      }
    },
  );
});
