import { AGENTS, getWorkflow, WAVE_ONE, WORKFLOWS } from "@/lib/agents/registry";
import { ensureAgentSchema } from "@/lib/agents/schema";
import {
  createApprovals,
  createRun,
  findOpenRun,
  markRun,
  saveFindings,
  serializeResult,
  touchSchedule,
  upsertSchedule,
  writeAlert,
} from "@/lib/agents/store";
import type { WorkflowId } from "@/lib/agents/types";
import { today } from "@/lib/format";
import { logActivity } from "@/lib/db";

export type RunOptions = {
  workflowId: WorkflowId;
  triggeredBy?: "cron" | "manual" | "retry";
  dryRun?: boolean;
  force?: boolean;
  attempt?: number;
};

export async function bootstrapAgentSchedules() {
  await ensureAgentSchema();
  for (const workflow of WORKFLOWS) {
    await upsertSchedule(workflow.id, workflow.schedule, workflow.enabled, workflow.schedule);
  }
}

export async function runWorkflow(options: RunOptions) {
  await ensureAgentSchema();
  const workflow = getWorkflow(options.workflowId);
  if (!workflow) throw new Error(`Unknown workflow: ${options.workflowId}`);
  if (!workflow.enabled && options.triggeredBy === "cron") {
    return { skipped: true as const, reason: "Workflow disabled" };
  }

  const deskDate = today();
  const dedupeKey = workflow.dedupeKey.replace("{date}", deskDate);
  if (!options.force && options.triggeredBy !== "retry") {
    const existing = await findOpenRun(dedupeKey);
    if (existing) {
      return { skipped: true as const, reason: `Deduped against run ${existing.id} (${existing.status})`, runId: existing.id };
    }
  }

  const attempt = options.attempt ?? 1;
  let runId: string;
  try {
    runId = await createRun({
      workflowId: workflow.id,
      agentId: workflow.agentId,
      dedupeKey: options.force ? `${dedupeKey}:force:${Date.now()}` : dedupeKey,
      triggeredBy: options.triggeredBy ?? "manual",
      dryRun: Boolean(options.dryRun),
      attempt,
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const existing = await findOpenRun(dedupeKey);
      return {
        skipped: true as const,
        reason: existing ? `Deduped against run ${existing.id}` : "Duplicate run blocked",
        runId: existing?.id,
      };
    }
    throw error;
  }

  await markRun(runId, { status: "running", started_at: new Date().toISOString() });

  try {
    const result = await workflow.run({
      runId,
      workflowId: workflow.id,
      agentId: workflow.agentId,
      attempt,
      triggeredBy: options.triggeredBy ?? "manual",
      dryRun: Boolean(options.dryRun),
      now: new Date(),
      deskDate,
    });

    await saveFindings(runId, result.findings);

    const needsApproval = workflow.requiresApproval && (result.proposedActions?.length ?? 0) > 0;
    if (needsApproval && result.proposedActions) {
      await createApprovals(
        runId,
        result.proposedActions.map((action) => ({
          code: action.code,
          title: action.title,
          detail: action.detail,
          risk: action.risk,
        }))
      );
    }

    await markRun(runId, {
      status: needsApproval ? "awaiting_approval" : "succeeded",
      summary: result.summary,
      result_json: serializeResult(result),
      finished_at: new Date().toISOString(),
    });
    await touchSchedule(workflow.id);
    await logActivity(null, "Agent", `${workflow.name}: ${result.summary}`);

    return { skipped: false as const, runId, status: needsApproval ? "awaiting_approval" : "succeeded", result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown agent failure";
    await markRun(runId, {
      status: "failed",
      error: message,
      finished_at: new Date().toISOString(),
    });
    await writeAlert({
      runId,
      severity: "critical",
      title: `${workflow.name} failed`,
      detail: message,
    });
    await logActivity(null, "Agent", `${workflow.name} failed: ${message}`);

    if (attempt < workflow.maxAttempts) {
      return runWorkflow({
        workflowId: workflow.id,
        triggeredBy: "retry",
        dryRun: options.dryRun,
        force: true,
        attempt: attempt + 1,
      });
    }

    return { skipped: false as const, runId, status: "failed" as const, error: message };
  }
}

export async function runWaveOne(options?: { triggeredBy?: "cron" | "manual"; dryRun?: boolean; force?: boolean }) {
  await bootstrapAgentSchedules();
  const results = [];
  for (const workflowId of WAVE_ONE) {
    results.push({ workflowId, ...(await runWorkflow({ workflowId, ...options })) });
  }
  return results;
}

export async function runDueCronBundle(options?: { dryRun?: boolean; force?: boolean }) {
  // Cron callers invoke the full enabled Wave-1 pack daily; gated weekly jobs
  // can be triggered manually or by weekday-specific cron entries.
  return runWaveOne({ triggeredBy: "cron", dryRun: options?.dryRun, force: options?.force });
}

export function listAgentRoster() {
  return AGENTS.map((agent) => ({
    ...agent,
    workflows: WORKFLOWS.filter((workflow) => workflow.agentId === agent.id).map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      schedule: workflow.schedule,
      enabled: workflow.enabled,
      requiresApproval: workflow.requiresApproval,
    })),
  }));
}
