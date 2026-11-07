import { z } from "zod";

export const CustomSuiteConfigSchema = z.object({
  version: z.literal(1),
  suite: z.literal("custom"),
  basePort: z.number().int().positive().optional(),
  fixtures: z
    .array(
      z.object({
        path: z.string().min(1),
      }),
    )
    .min(1),
});

export type CustomSuiteConfig = z.infer<typeof CustomSuiteConfigSchema>;

export type ResolvedCustomSuiteConfig = {
  configPath: string;
  basePort: number | undefined;
  fixtureDirectories: string[];
};
