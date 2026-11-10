import { z } from "zod";

const ContextSchema = z.object({
  id: z.string().min(1),
  rootParams: z.record(z.string(), z.string()).default({}),
  sentinel: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
  cookies: z.record(z.string(), z.string()).optional(),
  host: z.string().min(1).optional(),
});

const BodySentinelOracleFields = {
  mustContain: z.string().min(1),
  mustNotContain: z.array(z.string()),
  /**
   * When true, a Next.js error document that contains none of the
   * forbidden sentinels counts as isolation PASS (patched nesting throw).
   */
  acceptErrorWithoutForbidden: z.boolean().default(false),
};

const BodySentinelOracleSchema = z.object({
  type: z.literal("body-sentinel"),
  ...BodySentinelOracleFields,
});

const FlightSentinelOracleSchema = z.object({
  type: z.literal("flight-sentinel"),
  ...BodySentinelOracleFields,
});

const ExcludesOtherTenantsOracleSchema = z.object({
  type: z.literal("excludes-other-tenants"),
  acceptErrorWithoutForbidden: z.boolean().default(false),
});

const WarmObserveOracleIds = {
  warmContext: z.string().min(1),
  observeContext: z.string().min(1),
};

const ColdFillRaceOracleSchema = z.object({
  type: z.literal("body-sentinel"),
  ...BodySentinelOracleFields,
  observeContext: z.string().min(1),
  raceDirectContext: z.string().min(1),
  raceUnstableContext: z.string().min(1),
});

const WarmThenObserveOracleSchema = z.discriminatedUnion("type", [
  BodySentinelOracleSchema.extend(WarmObserveOracleIds),
  FlightSentinelOracleSchema.extend(WarmObserveOracleIds),
  ExcludesOtherTenantsOracleSchema.extend(WarmObserveOracleIds),
]);

const TenantSwapOracleSchema = z.discriminatedUnion("type", [
  BodySentinelOracleSchema.extend(WarmObserveOracleIds),
  FlightSentinelOracleSchema.extend(WarmObserveOracleIds),
  ExcludesOtherTenantsOracleSchema.extend(WarmObserveOracleIds),
]);

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
  oracle: ColdFillRaceOracleSchema,
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
  oracle: WarmThenObserveOracleSchema,
});

const TenantSwapScenarioSchema = z.object({
  id: z.string().min(1),
  procedure: z.literal("tenant-swap"),
  path: z.string().min(1),
  contexts: z.array(ContextSchema).min(2),
  oracle: TenantSwapOracleSchema,
});

export const ExternalCacheSchema = z.object({
  adapter: z.literal("redis"),
  urlEnv: z.string().min(1).default("NCI_REDIS_URL"),
  keyPrefix: z.string().min(1).default("nci:"),
  reset: z.literal("before-scenario").default("before-scenario"),
});

export const FixtureManifestSchema = z
  .object({
    id: z.string().min(1),
    advisory: z.string().min(1),
    expected: z.enum(["PASS", "FAIL"]),
    nextVersion: z.string().min(1),
    cacheComponents: z.boolean(),
    healthPath: z.string().min(1),
    cachePolicy: z.enum(["memory", "persistent", "external"]),
    externalCache: ExternalCacheSchema.optional(),
    scenario: z.discriminatedUnion("procedure", [
      ColdFillRaceScenarioSchema,
      WarmThenObserveScenarioSchema,
      TenantSwapScenarioSchema,
    ]),
  })
  .superRefine((value, ctx) => {
    if (value.cachePolicy === "external" && !value.externalCache) {
      ctx.addIssue({
        code: "custom",
        message: "externalCache is required when cachePolicy is external",
        path: ["externalCache"],
      });
    }
    if (
      value.scenario.procedure === "cold-fill-race" &&
      value.cachePolicy !== "memory"
    ) {
      ctx.addIssue({
        code: "custom",
        message: "cold-fill-race requires cachePolicy memory",
        path: ["cachePolicy"],
      });
    }
  });

export type FixtureManifest = z.infer<typeof FixtureManifestSchema>;
export type ColdFillRaceScenario = z.infer<typeof ColdFillRaceScenarioSchema>;
export type WarmThenObserveScenario = z.infer<
  typeof WarmThenObserveScenarioSchema
>;
export type TenantSwapScenario = z.infer<typeof TenantSwapScenarioSchema>;
export type ExternalCacheConfig = z.infer<typeof ExternalCacheSchema>;
export type ScenarioContext = z.infer<typeof ContextSchema>;
