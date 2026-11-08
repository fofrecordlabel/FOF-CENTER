import type { Finding, WorkflowContext, WorkflowResult } from "@/lib/agents/types";
import { listContractViews, listExpenses, listProjectViews, listReleaseViews, listRoyaltyViews, listTodos } from "@/lib/db";
import { today } from "@/lib/format";

/** Release Management — readiness only; never publishes. */
export async function runReleaseReadinessScan(ctx: WorkflowContext): Promise<WorkflowResult> {
  const releases = await listReleaseViews();
  const findings: Finding[] = [];
  for (const release of releases.filter((row) => ["production", "delivered", "scheduled"].includes(row.status))) {
    if (!release.upc) {
      findings.push({
        severity: "warn",
        code: "RELEASE_NO_UPC",
        title: `${release.title} missing UPC`,
        detail: release.artist_name,
        entityType: "release",
        entityId: release.id,
        href: `/releases/${release.id}`,
      });
    }
    if (!release.cover_url) {
      findings.push({
        severity: "warn",
        code: "RELEASE_NO_COVER",
        title: `${release.title} missing cover`,
        detail: release.artist_name,
        entityType: "release",
        entityId: release.id,
        href: `/releases/${release.id}`,
      });
    }
  }
  return {
    summary: `Release readiness scanned ${releases.length} titles; ${findings.length} open gaps. No distribution submit attempted.`,
    findings,
    sources: [{ id: "desk-releases", status: "ok", detail: "Desk releases only. Publishing to stores requires human approval and distributor login." }],
    proposedActions: findings.length
      ? [
          {
            code: "PREPARE_DISTRIBUTOR_PACKET",
            title: "Prepare distributor delivery checklist packet",
            detail: "Would compile missing UPC/cover/ISRC into a checklist PDF. Does not upload to DistroKid or any DSP.",
            risk: "low",
            reversible: true,
          },
        ]
      : undefined,
    metrics: { releases: releases.length, gaps: findings.length, dryRun: ctx.dryRun },
  };
}

/** Royalty Reconciliation — gap detection only. */
export async function runRoyaltyGapScan(_ctx: WorkflowContext): Promise<WorkflowResult> {
  const royalties = await listRoyaltyViews();
  const findings: Finding[] = [];
  if (royalties.length === 0) {
    findings.push({
      severity: "info",
      code: "ROYALTY_EMPTY",
      title: "No royalty lines on the desk",
      detail: "Import authorized statements before reconciliation. Agents will not invent statement figures.",
      href: "/catalog",
    });
  }
  for (const line of royalties) {
    if (line.gross_cents < 0) {
      findings.push({
        severity: "critical",
        code: "ROYALTY_NEGATIVE_GROSS",
        title: `Negative gross on ${line.period} / ${line.source}`,
        detail: line.artist_name,
        entityType: "royalty",
        entityId: line.id,
      });
    }
  }
  return {
    summary: `Royalty gap scan over ${royalties.length} desk lines. External DSP statements not connected.`,
    findings,
    sources: [
      { id: "desk-royalties", status: "ok", detail: "Internal royalty rows only." },
      { id: "dsp-statements", status: "unavailable", detail: "No Spotify/Apple/distributor statement API configured." },
    ],
    metrics: { lines: royalties.length },
  };
}

/** Financial Control — anomaly flags; never spends. */
export async function runSpendAnomalyScan(ctx: WorkflowContext): Promise<WorkflowResult> {
  const expenses = await listExpenses();
  const projects = await listProjectViews();
  const findings: Finding[] = [];
  for (const project of projects) {
    if (project.spent_cents > project.budget_cents && project.budget_cents > 0) {
      findings.push({
        severity: "critical",
        code: "BUDGET_OVERRUN",
        title: `${project.name} over budget`,
        detail: `Spent ${project.spent_cents}¢ vs budget ${project.budget_cents}¢`,
        entityType: "project",
        entityId: project.id,
        href: "/projects",
      });
    }
  }
  const big = expenses.filter((row) => row.amount_cents >= 100_000);
  for (const row of big.slice(0, 20)) {
    findings.push({
      severity: "info",
      code: "LARGE_EXPENSE",
      title: `Large expense ${row.category} on ${row.spent_on}`,
      detail: `${row.payee || "Unknown payee"} · ${row.amount_cents}¢`,
      entityType: "expense",
      entityId: row.id,
      href: "/spend",
    });
  }
  return {
    summary: `Financial control scan: ${expenses.length} expenses, ${projects.length} budgets. No payments initiated.`,
    findings,
    sources: [{ id: "desk-finance", status: "ok", detail: "Desk expenses/projects only." }],
    proposedActions: findings.some((finding) => finding.code === "BUDGET_OVERRUN")
      ? [
          {
            code: "FREEZE_BUDGET_LINE",
            title: "Propose budget freeze on overrun lines",
            detail: "Would flag budgets as paused pending human review. Will not move money.",
            risk: "medium",
            reversible: true,
          },
        ]
      : undefined,
    metrics: { expenses: expenses.length, overruns: findings.filter((f) => f.code === "BUDGET_OVERRUN").length, dryRun: ctx.dryRun },
  };
}

/** Marketing & Growth — promo pulse from checklist/log. */
export async function runPromoPulse(_ctx: WorkflowContext): Promise<WorkflowResult> {
  const todos = await listTodos();
  const open = todos.filter((todo) => todo.done === 0 && todo.todo_date <= today());
  const findings: Finding[] = open.slice(0, 30).map((todo) => ({
    severity: "info" as const,
    code: "PROMO_OPEN_TASK",
    title: todo.title,
    detail: `Open checklist item for ${todo.todo_date}`,
    entityType: "todo",
    entityId: todo.id,
    href: "/checklist",
  }));
  return {
    summary: `Promo pulse: ${open.length} open checklist lines. No ads purchased.`,
    findings,
    sources: [{ id: "desk-checklist", status: "ok", detail: "Checklist templates/todos on the desk." }],
    proposedActions: [
      {
        code: "DRAFT_PROMO_PLAN",
        title: "Draft tomorrow’s promo plan",
        detail: "Would write a suggested post plan into logs as status=planned. Requires approval before insert.",
        risk: "low",
        reversible: true,
      },
    ],
    metrics: { open: open.length },
  };
}

export async function runResearchDigest(_ctx: WorkflowContext): Promise<WorkflowResult> {
  return {
    summary: "Web Research agent idle: no approved research queries or egress allowlist configured for automated browsing.",
    findings: [
      {
        severity: "info",
        code: "RESEARCH_DISABLED",
        title: "Automated web research not enabled",
        detail: "Enable only with an approved topic list. Agent will not scrape Spotify for monthly listeners.",
      },
    ],
    sources: [{ id: "web-research", status: "unavailable", detail: "No research allowlist / search API key." }],
    metrics: { enabled: 0 },
  };
}

export async function runContractRiskScan(_ctx: WorkflowContext): Promise<WorkflowResult> {
  const contracts = await listContractViews();
  const findings: Finding[] = [];
  for (const contract of contracts) {
    if (contract.status === "signature") {
      findings.push({
        severity: "warn",
        code: "CONTRACT_OUT_FOR_SIGNATURE",
        title: `${contract.title} out for signature`,
        detail: `${contract.artist_name} — agent will not sign or e-sign.`,
        entityType: "contract",
        entityId: contract.id,
        href: "/deals",
      });
    }
    if (contract.status === "executed" && contract.end_date && contract.end_date < today()) {
      findings.push({
        severity: "critical",
        code: "CONTRACT_EXPIRED",
        title: `${contract.title} past end date`,
        detail: contract.artist_name,
        entityType: "contract",
        entityId: contract.id,
        href: "/deals",
      });
    }
  }
  return {
    summary: `Contract scan: ${contracts.length} deals on file. No signatures applied.`,
    findings,
    sources: [{ id: "desk-contracts", status: "ok", detail: "Metadata only — contract PDFs not parsed until upload + approval." }],
    proposedActions: findings.length
      ? [
          {
            code: "REQUEST_LEGAL_REVIEW",
            title: "Request human legal review",
            detail: "Creates an activity note asking counsel to review. Does not change deal status.",
            risk: "low",
            reversible: true,
          },
        ]
      : undefined,
    metrics: { contracts: contracts.length },
  };
}

export async function runCatalogGapScan(_ctx: WorkflowContext): Promise<WorkflowResult> {
  const releases = await listReleaseViews();
  const findings = releases
    .filter((release) => release.status === "idea" || release.status === "unreleased")
    .slice(0, 40)
    .map((release) => ({
      severity: "info" as const,
      code: "CATALOG_UNRELEASED",
      title: `${release.title} still ${release.status}`,
      detail: release.artist_name,
      entityType: "release",
      entityId: release.id,
      href: `/releases/${release.id}`,
    }));
  return {
    summary: `A&R/catalog gap scan flagged ${findings.length} unreleased ideas.`,
    findings,
    sources: [{ id: "desk-catalog", status: "ok", detail: "Internal catalog only." }],
    metrics: { flagged: findings.length },
  };
}

export async function runAutomationSelfCheck(ctx: WorkflowContext): Promise<WorkflowResult> {
  return {
    summary: "Automation Engineering self-check: runtime present; cron auth depends on AGENTS_CRON_SECRET.",
    findings: process.env.AGENTS_CRON_SECRET?.trim()
      ? []
      : [
          {
            severity: "warn",
            code: "CRON_SECRET_MISSING",
            title: "Set AGENTS_CRON_SECRET before enabling schedules",
            detail: "Without it, /api/agents/cron rejects callers.",
          },
        ],
    sources: [{ id: "agent-runtime", status: "ok", detail: `Run ${ctx.runId} executing inside Next.js server runtime.` }],
    metrics: { cronSecret: Boolean(process.env.AGENTS_CRON_SECRET?.trim()) },
  };
}

export async function runSchemaHealth(ctx: WorkflowContext): Promise<WorkflowResult> {
  try {
    await (await import("@/lib/agents/schema")).ensureAgentSchema();
    return {
      summary: "Agent schema ensure completed (CREATE IF NOT EXISTS).",
      findings: [],
      sources: [{ id: "agent-schema", status: "ok", detail: "agent_* and streaming_snapshots tables ensured." }],
      metrics: { dryRun: ctx.dryRun },
    };
  } catch (error) {
    return {
      summary: "Agent schema ensure failed.",
      findings: [
        {
          severity: "critical",
          code: "SCHEMA_ENSURE_FAILED",
          title: "Could not ensure agent tables",
          detail: error instanceof Error ? error.message : "Unknown error",
        },
      ],
      sources: [{ id: "agent-schema", status: "unavailable", detail: "Migration failed." }],
      metrics: {},
    };
  }
}

export async function runUxFrictionScan(_ctx: WorkflowContext): Promise<WorkflowResult> {
  return {
    summary: "UX agent: no product analytics sink configured. Friction scan limited to static notes.",
    findings: [
      {
        severity: "info",
        code: "UX_NO_TELEMETRY",
        title: "No UX telemetry backend",
        detail: "Phone shell + desk alerts exist. Add an approved analytics key before automated friction scoring.",
        href: "/",
      },
    ],
    sources: [{ id: "ux-telemetry", status: "unavailable", detail: "Not configured." }],
    metrics: { telemetry: 0 },
  };
}
