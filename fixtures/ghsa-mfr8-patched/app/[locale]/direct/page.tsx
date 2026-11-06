import { connection } from "next/server";

import { getCachedLocaleMarker } from "../../../lib/cached-data";

export const instant = false;

export default async function DirectPage() {
  // Keep this request-time so cold fills are not served from prerender HTML.
  await connection();
  const marker = await getCachedLocaleMarker();
  return (
    <main>
      <p id="marker">{marker}</p>
      <p id="path">direct</p>
    </main>
  );
}
