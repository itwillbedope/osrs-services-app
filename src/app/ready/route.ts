import { NextResponse } from "next/server";

import { createReadinessPayload } from "@/lib/readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await createReadinessPayload();
  return NextResponse.json(payload, {
    status: payload.status === "ready" ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
