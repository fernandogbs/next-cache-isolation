import { z } from "zod";

import { FixtureManifestSchema } from "../fixtures/manifest.js";

export const CustomSuiteFixtureEntrySchema = z.object({
  path: z.string().min(1),
  manifest: FixtureManifestSchema.optional(),
});

export const CustomSuiteConfigSchema = z.object({
  version: z.literal(1),
  suite: z.literal("custom"),
  basePort: z.number().int().positive().optional(),
  fixtures: z.array(CustomSuiteFixtureEntrySchema).min(1),
});

export type CustomSuiteConfig = z.infer<typeof CustomSuiteConfigSchema>;
export type CustomSuiteFixtureEntry = z.infer<
  typeof CustomSuiteFixtureEntrySchema
>;

export type ResolvedCustomFixture = {
  directory: string;
  manifest?: z.infer<typeof FixtureManifestSchema>;
};

export type ResolvedCustomSuiteConfig = {
  configPath: string;
  basePort: number | undefined;
  fixtures: ResolvedCustomFixture[];
  /** @deprecated use fixtures; kept for doctor path iteration helpers */
  fixtureDirectories: string[];
};
