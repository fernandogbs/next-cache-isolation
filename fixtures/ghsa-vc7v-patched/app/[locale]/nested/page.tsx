import { connection } from "next/server";

import { outerCached } from "../../../lib/nested-cache";

export const instant = false;

export default async function NestedPage() {
  // Request-time so warm/observe are not served from prerender HTML alone.
  await connection();
  const marker = await outerCached();
  return (
    <main>
      <p id="marker">{marker}</p>
      <p id="path">nested</p>
    </main>
  );
}
