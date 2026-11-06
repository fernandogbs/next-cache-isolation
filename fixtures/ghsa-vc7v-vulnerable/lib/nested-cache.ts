import { locale } from "next/root-params";

const SENTINELS: Record<string, string> = {
  "pt-BR": "NCI_VC7V_PT_BR",
  "en-US": "NCI_VC7V_EN_US",
};

const GLOBAL_KEY = "__nci_vc7v_slow_hold_ms__";

function slowHoldMs(): number {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: number;
  };
  return g[GLOBAL_KEY] ?? 5_000;
}

/**
 * Inner public `'use cache'`: reads root param, returns an immediately
 * ready early value plus a slower pending promise (GHSA-vc7v trigger).
 */
async function innerCached(): Promise<{
  early: string;
  slow: Promise<string>;
}> {
  "use cache";
  const value = await locale();
  const early = SENTINELS[value] ?? `NCI_VC7V_UNKNOWN_${value}`;
  const slow = new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve(`SLOW_${value}`);
    }, slowHoldMs());
  });
  return { early, slow };
}

/**
 * Outer public `'use cache'`: finishes without awaiting the inner slow
 * value so the outer entry can be persisted before root-param deps publish.
 */
export async function outerCached(): Promise<string> {
  "use cache";
  const data = await innerCached();
  return data.early;
}
