import { connection } from "next/server";

import { getCachedFile } from "../lib/cached-file";

export const instant = false;

function parseHexBytes(hex: string): Uint8Array<ArrayBuffer> {
  const pairs = hex.match(/../g) ?? [];
  const bytes = new Uint8Array(pairs.length);
  pairs.forEach((pair, index) => {
    bytes[index] = Number.parseInt(pair, 16);
  });
  return bytes;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  const hex = typeof params.bytes === "string" ? params.bytes : "44";
  const name = typeof params.name === "string" ? params.name : "default";
  const type = typeof params.type === "string" ? params.type : "text/plain";
  const bytes = parseHexBytes(hex);
  const file = new File([bytes], name, { type });
  const marker = await getCachedFile(file);
  return (
    <main>
      <p id="marker">{marker}</p>
      <p id="path">binary-file</p>
    </main>
  );
}
