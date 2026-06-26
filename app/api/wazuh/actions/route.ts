import { NextRequest, NextResponse } from "next/server";
import { withSession } from "@/lib/api-helpers";
import { runAction, type ActionRequest, type ActionType } from "@/lib/wazuh/actions";

export const dynamic = "force-dynamic";

const ALLOWED: readonly ActionType[] = [
  "acknowledgeAlert",
  "archiveAlert",
  "escalateAlert",
  "isolateAgent",
  "unisolateAgent",
  "restartAgent",
  "setVulnStatus",
  "markFimReviewed",
  "toggleRule"
];

function isActionType(value: unknown): value is ActionType {
  return typeof value === "string" && (ALLOWED as readonly string[]).includes(value);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const type = (body as { type?: unknown }).type;
  const targetId = (body as { targetId?: unknown }).targetId;
  const payload = (body as { payload?: unknown }).payload;
  if (!isActionType(type) || typeof targetId !== "string" || !targetId) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const action: ActionRequest = { type, targetId, payload: payload as ActionRequest["payload"] };

  return withSession(async (session) => {
    const result = await runAction(session, action);
    const status = result.ok ? 200 : 400;
    return NextResponse.json(result, { status });
  });
}
