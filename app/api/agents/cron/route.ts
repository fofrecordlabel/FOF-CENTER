import { cronAuthorized } from "@/lib/agents/auth";
import { runDueCronBundle, runWorkflow } from "@/lib/agents/engine";
import { getWorkflow } from "@/lib/agents/registry";
import type { WorkflowId } from "@/lib/agents/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = cronAuthorized(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 401 });
  }

  let body: { workflowId?: string; dryRun?: boolean; force?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (body.workflowId) {
    if (!getWorkflow(body.workflowId as WorkflowId)) {
      return NextResponse.json({ ok: false, error: "Unknown workflow" }, { status: 400 });
    }
    const result = await runWorkflow({
      workflowId: body.workflowId as WorkflowId,
      triggeredBy: "cron",
      dryRun: Boolean(body.dryRun),
      force: Boolean(body.force),
    });
    return NextResponse.json({ ok: true, result });
  }

  const results = await runDueCronBundle({ dryRun: Boolean(body.dryRun), force: Boolean(body.force) });
  return NextResponse.json({ ok: true, results });
}

export async function GET(request: Request) {
  const auth = cronAuthorized(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    message: "FOF agents cron endpoint ready. POST to run Wave 1 or a specific workflowId.",
  });
}
