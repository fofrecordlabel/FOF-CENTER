export type AgentId =
  | "chief-of-staff"
  | "streaming-intelligence"
  | "isrc-rights"
  | "release-management"
  | "royalty-reconciliation"
  | "financial-control"
  | "marketing-growth"
  | "web-research"
  | "contract-analysis"
  | "catalog-ar"
  | "data-quality"
  | "automation-engineering"
  | "database-integrations"
  | "user-experience";

export type WorkflowId =
  | "daily-streaming-metrics"
  | "isrc-metadata-audit"
  | "daily-executive-briefing"
  | "integration-health"
  | "release-readiness-scan"
  | "royalty-gap-scan"
  | "spend-anomaly-scan"
  | "promo-pulse"
  | "research-digest"
  | "contract-risk-scan"
  | "catalog-gap-scan"
  | "automation-self-check"
  | "schema-health"
  | "ux-friction-scan";

export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "skipped" | "awaiting_approval";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";
export type IntegrationStatus = "ok" | "degraded" | "unavailable" | "misconfigured";

export type AgentDefinition = {
  id: AgentId;
  name: string;
  mandate: string;
  workflows: WorkflowId[];
  canSpend: false;
  canPublish: false;
  canSign: false;
  canAlterOwnership: false;
};

export type WorkflowDefinition = {
  id: WorkflowId;
  agentId: AgentId;
  name: string;
  description: string;
  /** Cron-like schedule label in America/New_York (documented; runner uses cron API). */
  schedule: string;
  /** Deduplicate key template; `{date}` becomes desk-local YYYY-MM-DD. */
  dedupeKey: string;
  maxAttempts: number;
  requiresApproval: boolean;
  enabled: boolean;
  run: (ctx: WorkflowContext) => Promise<WorkflowResult>;
};

export type WorkflowContext = {
  runId: string;
  workflowId: WorkflowId;
  agentId: AgentId;
  attempt: number;
  triggeredBy: "cron" | "manual" | "retry";
  dryRun: boolean;
  now: Date;
  deskDate: string;
};

export type Finding = {
  severity: "info" | "warn" | "critical";
  code: string;
  title: string;
  detail: string;
  entityType?: string;
  entityId?: string;
  href?: string;
};

export type DataSourceNote = {
  id: string;
  status: IntegrationStatus;
  detail: string;
};

export type WorkflowResult = {
  summary: string;
  findings: Finding[];
  sources: DataSourceNote[];
  metrics?: Record<string, number | string | boolean | null>;
  artifacts?: Array<{ kind: string; title: string; body: string }>;
  /** When set, run pauses for human approval before any side effects listed here. */
  proposedActions?: ProposedAction[];
};

export type ProposedAction = {
  code: string;
  title: string;
  detail: string;
  risk: "low" | "medium" | "high";
  reversible: boolean;
};

export type AgentRun = {
  id: string;
  workflow_id: WorkflowId;
  agent_id: AgentId;
  status: RunStatus;
  attempt: number;
  dedupe_key: string;
  triggered_by: string;
  dry_run: number;
  summary: string | null;
  error: string | null;
  result_json: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type AgentApproval = {
  id: string;
  run_id: string;
  status: ApprovalStatus;
  action_code: string;
  title: string;
  detail: string;
  risk: string;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
};

export type AgentSchedule = {
  id: string;
  workflow_id: WorkflowId;
  cron_label: string;
  enabled: number;
  last_run_at: string | null;
  next_hint: string | null;
  updated_at: string;
};

export type IntegrationCheck = {
  id: string;
  name: string;
  status: IntegrationStatus;
  detail: string;
  checked_at: string;
};

export type AgentBriefing = {
  id: string;
  brief_date: string;
  title: string;
  body: string;
  run_id: string | null;
  created_at: string;
};
