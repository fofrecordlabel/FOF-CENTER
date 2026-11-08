"use server";

import { revalidatePath } from "next/cache";
import { runWorkflow, bootstrapAgentSchedules } from "@/lib/agents/engine";
import { decideApproval } from "@/lib/agents/store";
import type { WorkflowId } from "@/lib/agents/types";
import { getWorkflow } from "@/lib/agents/registry";

export async function triggerAgentWorkflow(formData: FormData) {
  const workflowId = String(formData.get("workflow_id") || "") as WorkflowId;
  const dryRun = formData.get("dry_run") === "1";
  const force = formData.get("force") === "1";
  if (!getWorkflow(workflowId)) {
    revalidatePath("/ops");
    return;
  }
  await bootstrapAgentSchedules();
  await runWorkflow({ workflowId, triggeredBy: "manual", dryRun, force });
  revalidatePath("/ops");
  revalidatePath("/");
}

export async function decideAgentApproval(formData: FormData) {
  const id = String(formData.get("id") || "");
  const decision = String(formData.get("decision") || "");
  if (!id || (decision !== "approved" && decision !== "rejected")) {
    revalidatePath("/ops");
    return;
  }
  // Approvals are recorded only. Side-effect execution for approved actions
  // stays disabled until an explicit per-action executor is implemented and reviewed.
  await decideApproval(id, decision, "desk-operator");
  revalidatePath("/ops");
}
