import { z } from "zod";

export const FixtureManifestSchema = z.object({
  id: z.string().min(1),
  advisory: z.string().min(1),
  expected: z.enum(["PASS", "FAIL"]),
  nextVersion: z.string().min(1),
  cacheComponents: z.boolean(),
  healthPath: z.string().min(1),
  cachePolicy: z.enum(["memory", "persistent", "external"]),
  scenario: z.object({
    id: z.string().min(1),
    rootParamName: z.string().min(1),
    contexts: z
      .array(
        z.object({
          id: z.string().min(1),
          rootParams: z.record(z.string(), z.string()),
          sentinel: z.string().min(1),
        }),
      )
      .min(2),
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
      type: z.literal("body-sentinel"),
      observeContext: z.string().min(1),
      raceDirectContext: z.string().min(1),
      raceUnstableContext: z.string().min(1),
      mustContain: z.string().min(1),
      mustNotContain: z.array(z.string()),
      /**
       * When true, a Next.js error document that contains none of the
       * forbidden sentinels counts as isolation PASS (patched nesting throw).
       */
      acceptErrorWithoutForbidden: z.boolean().default(false),
    }),
  }),
});

export type FixtureManifest = z.infer<typeof FixtureManifestSchema>;
