import { unstable_cache } from "next/cache";
import { connection } from "next/server";

import { getCachedLocaleMarker } from "../../../lib/cached-data";

export const instant = false;

/**
 * Observe through the unstable_cache path that may have stored a
 * contaminated entry under a key without root params.
 */
export default async function ObservePage() {
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
      <p id="path">observe</p>
    </main>
  );
}
