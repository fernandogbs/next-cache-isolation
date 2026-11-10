import type { ScenarioContext } from "../fixtures/manifest.js";
import {
  evaluateBodySentinel,
  type OracleResult,
} from "../validators/body-sentinel.js";
import { evaluateFlightSentinel } from "../validators/flight-sentinel.js";

export type IsolationOracle =
  | {
      type: "body-sentinel";
      mustContain: string;
      mustNotContain: string[];
      acceptErrorWithoutForbidden?: boolean;
      warmContext?: string;
      observeContext?: string;
      raceDirectContext?: string;
      raceUnstableContext?: string;
    }
  | {
      type: "flight-sentinel";
      mustContain: string;
      mustNotContain: string[];
      acceptErrorWithoutForbidden?: boolean;
      warmContext?: string;
      observeContext?: string;
    }
  | {
      type: "excludes-other-tenants";
      acceptErrorWithoutForbidden?: boolean;
      warmContext: string;
      observeContext: string;
    };

export function resolveOracleMarkers(
  oracle: IsolationOracle,
  contexts: ScenarioContext[],
): {
  mustContain: string;
  mustNotContain: string[];
  acceptErrorWithoutForbidden: boolean;
  kind: "body-sentinel" | "flight-sentinel";
} {
  if (oracle.type === "excludes-other-tenants") {
    const observe = contexts.find((ctx) => ctx.id === oracle.observeContext);
    if (!observe) {
      throw new Error(`Unknown observe context: ${oracle.observeContext}`);
    }
    return {
      kind: "body-sentinel",
      mustContain: observe.sentinel,
      mustNotContain: contexts
        .filter((ctx) => ctx.id !== oracle.observeContext)
        .map((ctx) => ctx.sentinel),
      acceptErrorWithoutForbidden: Boolean(oracle.acceptErrorWithoutForbidden),
    };
  }

  return {
    kind: oracle.type,
    mustContain: oracle.mustContain,
    mustNotContain: oracle.mustNotContain,
    acceptErrorWithoutForbidden: Boolean(oracle.acceptErrorWithoutForbidden),
  };
}

export function evaluateIsolationOracle(input: {
  oracle: IsolationOracle;
  contexts: ScenarioContext[];
  statusCode: number;
  body: string;
  durationMs: number;
}): OracleResult {
  const markers = resolveOracleMarkers(input.oracle, input.contexts);
  const payload = {
    statusCode: input.statusCode,
    body: input.body,
    mustContain: markers.mustContain,
    mustNotContain: markers.mustNotContain,
    acceptErrorWithoutForbidden: markers.acceptErrorWithoutForbidden,
  };
  if (markers.kind === "flight-sentinel") {
    return evaluateFlightSentinel(payload, input.durationMs);
  }
  return evaluateBodySentinel(payload, input.durationMs);
}

export const RSC_OBSERVE_HEADERS = {
  RSC: "1",
  Accept: "text/x-component",
} as const;
