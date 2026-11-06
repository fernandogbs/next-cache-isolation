import { connection } from "next/server";

import { armLatch } from "../../../../lib/latch";

export async function POST(request: Request) {
  await connection();
  const body = (await request.json().catch(() => ({}))) as { holdMs?: number };
  armLatch(typeof body.holdMs === "number" ? body.holdMs : 2000);
  return Response.json({ armed: true });
}
