import { streamingSourceNotes } from "@/lib/agents/collectors/streaming";
import { upsertIntegration } from "@/lib/agents/store";
import type { Finding, IntegrationCheck, WorkflowContext, WorkflowResult } from "@/lib/agents/types";
import { query } from "@/lib/pg";

export async function runIntegrationHealth(ctx: WorkflowContext): Promise<WorkflowResult> {
  const checkedAt = new Date().toISOString();
  const checks: IntegrationCheck[] = [];
  const findings: Finding[] = [];

  // Database
  try {
    await query("SELECT 1 AS ok");
    checks.push({
      id: "supabase-postgres",
      name: "Supabase Postgres (desk)",
      status: "ok",
      detail: "DATABASE_URL reachable; SELECT 1 succeeded.",
      checked_at: checkedAt,
    });
  } catch (error) {
    checks.push({
      id: "supabase-postgres",
      name: "Supabase Postgres (desk)",
      status: "unavailable",
      detail: error instanceof Error ? error.message : "Database unreachable",
      checked_at: checkedAt,
    });
    findings.push({
      severity: "critical",
      code: "DB_DOWN",
      title: "Desk database unreachable",
      detail: error instanceof Error ? error.message : "Unknown database error",
    });
  }

  // Cron secret
  checks.push({
    id: "agents-cron-secret",
    name: "Agents cron secret",
    status: process.env.AGENTS_CRON_SECRET?.trim() ? "ok" : "misconfigured",
    detail: process.env.AGENTS_CRON_SECRET?.trim()
      ? "AGENTS_CRON_SECRET is set for scheduled runs."
      : "AGENTS_CRON_SECRET missing — external cron cannot authenticate.",
    checked_at: checkedAt,
  });

  // Streaming sources
  for (const note of streamingSourceNotes()) {
    checks.push({
      id: note.id,
      name: note.id,
      status: note.status,
      detail: note.detail,
      checked_at: checkedAt,
    });
  }

  // Alert webhook
  checks.push({
    id: "alert-webhook",
    name: "Failure alert webhook",
    status: process.env.ALERT_WEBHOOK_URL?.trim() ? "ok" : "unavailable",
    detail: process.env.ALERT_WEBHOOK_URL?.trim()
      ? "ALERT_WEBHOOK_URL configured."
      : "No ALERT_WEBHOOK_URL — failures log to agent_alerts only.",
    checked_at: checkedAt,
  });

  // Desk gate (informational — not a secret dump)
  checks.push({
    id: "desk-gate",
    name: "Desk PIN gate",
    status: "ok",
    detail: "Cookie gate active via middleware. Rotate PIN/SECRET in lib/gate.ts when hardening.",
    checked_at: checkedAt,
  });

  // Known unavailable distributors / PROs
  for (const item of [
    { id: "distrokid-api", name: "DistroKid API", detail: "No distributor partner credentials configured." },
    { id: "soundexchange", name: "SoundExchange feed", detail: "No automated SoundExchange integration." },
    { id: "mlc", name: "The MLC feed", detail: "No automated MLC integration." },
    { id: "bmi-ascap", name: "PRO statements", detail: "No BMI/ASCAP/SESAC statement ingestion configured." },
  ]) {
    checks.push({
      id: item.id,
      name: item.name,
      status: "unavailable",
      detail: item.detail,
      checked_at: checkedAt,
    });
  }

  for (const check of checks) {
    if (check.status === "misconfigured") {
      findings.push({
        severity: "warn",
        code: `HEALTH_${check.id.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
        title: `${check.name} misconfigured`,
        detail: check.detail,
      });
    }
    if (!ctx.dryRun) await upsertIntegration(check);
  }

  const ok = checks.filter((check) => check.status === "ok").length;
  const bad = checks.filter((check) => check.status !== "ok").length;

  return {
    summary: `Integration health: ${ok} ok, ${bad} degraded/unavailable/misconfigured.`,
    findings,
    sources: checks.map((check) => ({ id: check.id, status: check.status, detail: check.detail })),
    metrics: { ok, bad, total: checks.length },
  };
}
