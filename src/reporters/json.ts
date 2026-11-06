import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SliceReport } from "./types.js";

export async function writeJsonReport(
  report: SliceReport,
  outputDirectory = ".next-cache-isolation",
): Promise<string> {
  await mkdir(outputDirectory, { recursive: true });
  const filePath = path.join(outputDirectory, "report.json");
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return filePath;
}
