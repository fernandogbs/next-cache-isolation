import { connection } from "next/server";

import { releaseLatch } from "../../../../lib/latch";

export async function POST() {
  await connection();
  releaseLatch();
  return Response.json({ released: true });
}
