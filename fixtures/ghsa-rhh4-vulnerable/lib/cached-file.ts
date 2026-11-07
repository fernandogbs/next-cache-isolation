/**
 * Public `'use cache'` with a File argument. Distinct File.name values must
 * produce distinct cache identity (GHSA-rhh4-g77r-r9qj).
 */
export async function getCachedFile(file: File): Promise<string> {
  "use cache";
  return `NCI_RHH4_${file.name}`;
}
