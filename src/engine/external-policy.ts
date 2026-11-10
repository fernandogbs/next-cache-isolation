import type { ExternalCacheAdapter } from "../cache/types.js";
import type { OracleResult } from "../validators/body-sentinel.js";

export type RunExternalWarmObserveOptions = {
  adapter: ExternalCacheAdapter;
  warm: () => Promise<void>;
  restart: () => Promise<void>;
  observe: () => Promise<OracleResult>;
};

/**
 * external policy: reset store → warm → restart process → observe → reset.
 * Always dispose the adapter afterwards.
 */
export async function runExternalWarmObserve(
  options: RunExternalWarmObserveOptions,
): Promise<OracleResult> {
  try {
    await options.adapter.reset();
    await options.warm();
    await options.restart();
    return await options.observe();
  } finally {
    try {
      await options.adapter.reset();
    } finally {
      await options.adapter.dispose();
    }
  }
}
