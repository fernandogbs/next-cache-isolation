import { locale } from "next/root-params";

import { waitIfArmed } from "./latch";

const SENTINELS: Record<string, string> = {
  "pt-BR": "NCI_SENTINEL_PT_BR",
  "en-US": "NCI_SENTINEL_EN_US",
};

/**
 * Public `'use cache'` function that reads a root param.
 * Called both directly during render and through `unstable_cache`
 * to encode GHSA-mfr8-8qww-v76h preconditions.
 */
export async function getCachedLocaleMarker(): Promise<string> {
  "use cache";
  const value = await locale();
  await waitIfArmed();
  return SENTINELS[value] ?? `NCI_SENTINEL_UNKNOWN_${value}`;
}
