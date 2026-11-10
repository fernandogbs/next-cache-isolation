import { createClient, type RedisClientType } from "redis";

import type { ExternalCacheAdapter } from "./types.js";

export type RedisLikeClient = {
  connect(): Promise<unknown>;
  quit(): Promise<unknown>;
  scan(
    cursor: string,
    options: { MATCH: string; COUNT: number },
  ): Promise<[string, string[]] | { cursor: number | string; keys: string[] }>;
  del(keys: string[]): Promise<number>;
  flushDb?: () => Promise<unknown>;
};

export type CreateRedisExternalCacheAdapterOptions = {
  keyPrefix: string;
  url?: string;
  client?: RedisLikeClient;
};

function normalizeScanResult(
  result:
    | [string, string[]]
    | { cursor: number | string; keys: string[] },
): { cursor: string; keys: string[] } {
  if (Array.isArray(result)) {
    return { cursor: result[0], keys: result[1] };
  }
  return {
    cursor: String(result.cursor),
    keys: result.keys,
  };
}

export function createRedisExternalCacheAdapter(
  options: CreateRedisExternalCacheAdapterOptions,
): ExternalCacheAdapter {
  let ownsClient = false;
  let client: RedisLikeClient | undefined = options.client;
  let connected = false;

  async function ensureClient(): Promise<RedisLikeClient> {
    if (client) {
      if (!connected && options.client) {
        await client.connect();
        connected = true;
      } else if (!connected && !options.client) {
        await client.connect();
        connected = true;
      }
      return client;
    }
    if (!options.url) {
      throw new Error("Redis external cache requires url or client");
    }
    const created = createClient({ url: options.url }) as RedisClientType;
    ownsClient = true;
    client = {
      connect: () => created.connect(),
      quit: () => created.quit(),
      scan: (cursor, scanOptions) =>
        created.scan(cursor, scanOptions) as Promise<
          [string, string[]] | { cursor: number | string; keys: string[] }
        >,
      del: (keys) => created.del(keys),
    };
    await client.connect();
    connected = true;
    return client;
  }

  return {
    async reset(): Promise<void> {
      const redis = await ensureClient();
      let cursor = "0";
      do {
        const page = normalizeScanResult(
          await redis.scan(cursor, {
            MATCH: `${options.keyPrefix}*`,
            COUNT: 100,
          }),
        );
        cursor = page.cursor;
        if (page.keys.length > 0) {
          await redis.del(page.keys);
        }
      } while (cursor !== "0");
    },

    async dispose(): Promise<void> {
      if (!client || !connected) {
        return;
      }
      if (ownsClient || options.client) {
        await client.quit();
      }
      connected = false;
    },
  };
}

export function createRedisAdapterFromEnv(options: {
  urlEnv: string;
  keyPrefix: string;
}): ExternalCacheAdapter {
  const url = process.env[options.urlEnv];
  if (!url) {
    throw new Error(
      `Missing Redis URL in environment variable ${options.urlEnv}`,
    );
  }
  return createRedisExternalCacheAdapter({
    url,
    keyPrefix: options.keyPrefix,
  });
}
