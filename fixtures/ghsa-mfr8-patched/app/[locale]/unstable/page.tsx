import { unstable_cache } from "next/cache";
import { connection } from "next/server";

import { getCachedLocaleMarker } from "../../../lib/cached-data";

export const instant = false;

export default async function UnstablePage() {
  // Force request-time rendering so SSG does not eagerly nest use cache
  // inside unstable_cache (that path throws outside the cold-fill race).
  await connection();
  const getViaUnstable = unstable_cache(
    async () => getCachedLocaleMarker(),
    ["nci-mfr8-unstable"],
    { revalidate: false },
  );
  const marker = await getViaUnstable();
  return (
    <main>
      <p id="marker">{marker}</p>
      <p id="path">unstable</p>
    </main>
  );
}
