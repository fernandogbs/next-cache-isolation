import { z } from "zod";

const ContextSchema = z.object({
  id: z.string().min(1),
  rootParams: z.record(z.string(), z.string()),
  sentinel: z.string().min(1),
});

const BodySentinelOracleBase = {
  type: z.literal("body-sentinel"),
  mustContain: z.string().min(1),
  mustNotContain: z.array(z.string()),
  /**
   * When true, a Next.js error document that contains none of the
   * forbidden sentinels counts as isolation PASS (patched nesting throw).
   */
  acceptErrorWithoutForbidden: z.boolean().default(false),
};

const ColdFillRaceScenarioSchema = z.object({
  id: z.string().min(1),
  procedure: z.literal("cold-fill-race"),
  rootParamName: z.string().min(1),
  contexts: z.array(ContextSchema).min(2),
  paths: z.object({
    direct: z.string().min(1),
    unstable: z.string().min(1),
    observe: z.string().min(1),
  }),
  latch: z.object({
    enabled: z.boolean(),
    holdMs: z.number().int().positive(),
    armPath: z.string().min(1),
    releasePath: z.string().min(1),
  }),
  oracle: z.object({
    ...BodySentinelOracleBase,
    observeContext: z.string().min(1),
    raceDirectContext: z.string().min(1),
    raceUnstableContext: z.string().min(1),
  }),
});

const WarmThenObserveScenarioSchema = z.object({
  id: z.string().min(1),
  procedure: z.literal("warm-then-observe"),
  rootParamName: z.string().min(1),
  contexts: z.array(ContextSchema).min(2),
  paths: z.object({
    warm: z.string().min(1),
    observe: z.string().min(1),
  }),
  oracle: z.object({
    ...BodySentinelOracleBase,
    warmContext: z.string().min(1),
    observeContext: z.string().min(1),
  }),
});

export const FixtureManifestSchema = z.object({
  id: z.string().min(1),
  advisory: z.string().min(1),
  expected: z.enum(["PASS", "FAIL"]),
  nextVersion: z.string().min(1),
  cacheComponents: z.boolean(),
  healthPath: z.string().min(1),
  cachePolicy: z.enum(["memory", "persistent", "external"]),
  scenario: z.discriminatedUnion("procedure", [
    ColdFillRaceScenarioSchema,
    WarmThenObserveScenarioSchema,
  ]),
});

export type FixtureManifest = z.infer<typeof FixtureManifestSchema>;
export type ColdFillRaceScenario = z.infer<typeof ColdFillRaceScenarioSchema>;
export type WarmThenObserveScenario = z.infer<
  typeof WarmThenObserveScenarioSchema
>;
