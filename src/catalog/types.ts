import { z } from "zod";

export const AdvisoryCatalogEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  affectedRange: z.string().min(1),
  fixtureVulnerablePin: z.string().nullable(),
  fixturePatchedPin: z.string().min(1),
  notes: z.array(z.string()),
});

export type AdvisoryCatalogEntry = z.infer<typeof AdvisoryCatalogEntrySchema>;
