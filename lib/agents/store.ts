import { ensureAgentSchema } from "@/lib/agents/schema";
import type {
  AgentApproval,
  AgentBriefing,
  AgentRun,
  AgentSchedule,
  Finding,
  IntegrationCheck,
  RunStatus,
  WorkflowId,
  WorkflowResult,
} from "@/lib/agents/types";
import { query } from "@/lib/pg";
import { insert, uid, updateRow } from "@/lib/sql";

async function ready() {
  await ensureAgentSchema();
}

function plain<T>(row: T): T {
  if (row == null || typeof row !== "object") return row;
  if (Array.isArray(row)) return row.map((item) => plain(item)) as T;
  return Object.fromEntries(Object.entries(row as Record<string, unknown>).map(([key, value]) => [key, plain(value)])) as T;
}

export async function findOpenRun(dedupeKey: string) {
  await ready();
  const rows = await query<AgentRun>(
    `SELECT * FROM agent_runs
     WHERE dedupe_key = ?
       AND status IN ('queued','running','succeeded','awaiting_approval')
     ORDER BY created_at DESC LIMIT 1`,
    [dedupeKey]
  );
  return rows[0] ? plain(rows[0]) : null;
}

export async function createRun(input: {
  workflowId: WorkflowId;
  agentId: string;
  dedupeKey: string;
  triggeredBy: string;
  dryRun: boolean;
  attempt: number;
}) {
  await ready();
  const id = uid();
  const created = new Date().toISOString();
  await insert("agent_runs", {
    id,
    workflow_id: input.workflowId,
    agent_id: input.agentId,
    status: "queued",
    attempt: input.attempt,
    dedupe_key: input.dedupeKey,
    triggered_by: input.triggeredBy,
    dry_run: input.dryRun ? 1 : 0,
    summary: null,
    error: null,
    result_json: null,
    started_at: null,
    finished_at: null,
    created_at: created,
  });
  return id;
}

export async function markRun(id: string, fields: Partial<{
  status: RunStatus;
  summary: string | null;
  error: string | null;
  result_json: string | null;
  started_at: string | null;
  finished_at: string | null;
  attempt: number;
}>) {
  await ready();
  await updateRow("agent_runs", id, fields as Record<string, string | number | null>);
}

export async function listRuns(limit = 40) {
  await ready();
  return plain(await query<AgentRun>("SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT ?", [limit]));
}

export async function getRun(id: string) {
  await ready();
  const rows = await query<AgentRun>("SELECT * FROM agent_runs WHERE id = ?", [id]);
  return rows[0] ? plain(rows[0]) : null;
}

export async function saveFindings(runId: string, findings: Finding[]) {
  await ready();
  const stamp = new Date().toISOString();
  for (const finding of findings) {
    await insert("agent_audit_findings", {
      id: uid(),
      run_id: runId,
      severity: finding.severity,
      code: finding.code,
      title: finding.title,
      detail: finding.detail,
      entity_type: finding.entityType ?? null,
      entity_id: finding.entityId ?? null,
      href: finding.href ?? null,
      created_at: stamp,
    });
  }
}

export async function listFindings(runId?: string) {
  await ready();
  if (runId) {
    return plain(
      await query<{
        id: string;
        run_id: string;
        severity: string;
        code: string;
        title: string;
        detail: string;
        entity_type: string | null;
        entity_id: string | null;
        href: string | null;
        created_at: string;
      }>("SELECT * FROM agent_audit_findings WHERE run_id = ? ORDER BY created_at DESC", [runId])
    );
  }
  return plain(
    await query<{
      id: string;
      run_id: string;
      severity: string;
      code: string;
      title: string;
      detail: string;
      entity_type: string | null;
      entity_id: string | null;
      href: string | null;
      created_at: string;
    }>("SELECT * FROM agent_audit_findings ORDER BY created_at DESC LIMIT 100")
  );
}

export async function createApprovals(
  runId: string,
  actions: Array<{ code: string; title: string; detail: string; risk: string }>
) {
  await ready();
  const stamp = new Date().toISOString();
  for (const action of actions) {
    await insert("agent_approvals", {
      id: uid(),
      run_id: runId,
      status: "pending",
      action_code: action.code,
      title: action.title,
      detail: action.detail,
      risk: action.risk,
      decided_by: null,
      decided_at: null,
      created_at: stamp,
    });
  }
}

export async function listApprovals(status?: string) {
  await ready();
  if (status) {
    return plain(await query<AgentApproval>("SELECT * FROM agent_approvals WHERE status = ? ORDER BY created_at DESC", [status]));
  }
  return plain(await query<AgentApproval>("SELECT * FROM agent_approvals ORDER BY created_at DESC LIMIT 50"));
}

export async function decideApproval(id: string, status: "approved" | "rejected", decidedBy: string) {
  await ready();
  await updateRow("agent_approvals", id, {
    status,
    decided_by: decidedBy,
    decided_at: new Date().toISOString(),
  });
}

export async function upsertSchedule(workflowId: WorkflowId, cronLabel: string, enabled: boolean, nextHint: string | null) {
  await ready();
  const existing = await query<{ id: string }>("SELECT id FROM agent_schedules WHERE workflow_id = ?", [workflowId]);
  const stamp = new Date().toISOString();
  if (existing[0]) {
    await updateRow("agent_schedules", existing[0].id, {
      cron_label: cronLabel,
      enabled: enabled ? 1 : 0,
      next_hint: nextHint,
      updated_at: stamp,
    });
    return existing[0].id;
  }
  const id = uid();
  await insert("agent_schedules", {
    id,
    workflow_id: workflowId,
    cron_label: cronLabel,
    enabled: enabled ? 1 : 0,
    last_run_at: null,
    next_hint: nextHint,
    updated_at: stamp,
  });
  return id;
}

export async function touchSchedule(workflowId: WorkflowId) {
  await ready();
  await query("UPDATE agent_schedules SET last_run_at = ?, updated_at = ? WHERE workflow_id = ?", [
    new Date().toISOString(),
    new Date().toISOString(),
    workflowId,
  ]);
}

export async function listSchedules() {
  await ready();
  return plain(await query<AgentSchedule>("SELECT * FROM agent_schedules ORDER BY workflow_id"));
}

export async function writeAlert(input: { runId?: string | null; severity: string; title: string; detail: string }) {
  await ready();
  await insert("agent_alerts", {
    id: uid(),
    run_id: input.runId ?? null,
    severity: input.severity,
    title: input.title,
    detail: input.detail,
    acknowledged: 0,
    created_at: new Date().toISOString(),
  });
  const webhook = process.env.ALERT_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: `[FOF Agents] ${input.severity.toUpperCase()}: ${input.title}\n${input.detail}`,
        }),
      });
    } catch {
      // Webhook failures must not break the desk.
    }
  }
}

export async function listAlerts(limit = 30) {
  await ready();
  return plain(
    await query<{
      id: string;
      run_id: string | null;
      severity: string;
      title: string;
      detail: string;
      acknowledged: number;
      created_at: string;
    }>("SELECT * FROM agent_alerts ORDER BY created_at DESC LIMIT ?", [limit])
  );
}

export async function saveBriefing(briefDate: string, title: string, body: string, runId: string | null) {
  await ready();
  const existing = await query<{ id: string }>("SELECT id FROM agent_briefings WHERE brief_date = ?", [briefDate]);
  if (existing[0]) {
    await updateRow("agent_briefings", existing[0].id, { title, body, run_id: runId });
    return existing[0].id;
  }
  const id = uid();
  await insert("agent_briefings", {
    id,
    brief_date: briefDate,
    title,
    body,
    run_id: runId,
    created_at: new Date().toISOString(),
  });
  return id;
}

export async function getBriefing(briefDate: string) {
  await ready();
  const rows = await query<AgentBriefing>("SELECT * FROM agent_briefings WHERE brief_date = ?", [briefDate]);
  return rows[0] ? plain(rows[0]) : null;
}

export async function listBriefings(limit = 14) {
  await ready();
  return plain(await query<AgentBriefing>("SELECT * FROM agent_briefings ORDER BY brief_date DESC LIMIT ?", [limit]));
}

export async function upsertStreamingSnapshot(input: {
  artistId: string;
  snapshotDate: string;
  source: string;
  monthlyListeners: number | null;
  followers: number | null;
  popularity: number | null;
  note: string | null;
  runId: string | null;
}) {
  await ready();
  const existing = await query<{ id: string }>(
    "SELECT id FROM streaming_snapshots WHERE artist_id = ? AND snapshot_date = ? AND source = ?",
    [input.artistId, input.snapshotDate, input.source]
  );
  if (existing[0]) {
    await updateRow("streaming_snapshots", existing[0].id, {
      monthly_listeners: input.monthlyListeners,
      followers: input.followers,
      popularity: input.popularity,
      note: input.note,
      run_id: input.runId,
    });
    return existing[0].id;
  }
  const id = uid();
  await insert("streaming_snapshots", {
    id,
    artist_id: input.artistId,
    snapshot_date: input.snapshotDate,
    source: input.source,
    monthly_listeners: input.monthlyListeners,
    followers: input.followers,
    popularity: input.popularity,
    note: input.note,
    run_id: input.runId,
    created_at: new Date().toISOString(),
  });
  return id;
}

export async function listStreamingSnapshots(limit = 100) {
  await ready();
  return plain(
    await query<{
      id: string;
      artist_id: string;
      snapshot_date: string;
      source: string;
      monthly_listeners: number | null;
      followers: number | null;
      popularity: number | null;
      note: string | null;
      run_id: string | null;
      created_at: string;
    }>("SELECT * FROM streaming_snapshots ORDER BY snapshot_date DESC, created_at DESC LIMIT ?", [limit])
  );
}

export async function upsertIntegration(check: IntegrationCheck) {
  await ready();
  const existing = await query<{ id: string }>("SELECT id FROM integration_health WHERE id = ?", [check.id]);
  if (existing[0]) {
    await updateRow("integration_health", check.id, {
      name: check.name,
      status: check.status,
      detail: check.detail,
      checked_at: check.checked_at,
    });
    return;
  }
  await insert("integration_health", {
    id: check.id,
    name: check.name,
    status: check.status,
    detail: check.detail,
    checked_at: check.checked_at,
  });
}

export async function listIntegrations() {
  await ready();
  return plain(await query<IntegrationCheck>("SELECT * FROM integration_health ORDER BY name"));
}

export function serializeResult(result: WorkflowResult) {
  return JSON.stringify(result);
}

export function parseResult(raw: string | null): WorkflowResult | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WorkflowResult;
  } catch {
    return null;
  }
}
