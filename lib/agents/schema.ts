import { query } from "@/lib/pg";

let ready: Promise<void> | null = null;

export function ensureAgentSchema() {
  if (!ready) {
    ready = migrate().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      status TEXT NOT NULL,
      attempt INTEGER NOT NULL DEFAULT 1,
      dedupe_key TEXT NOT NULL,
      triggered_by TEXT NOT NULL,
      dry_run INTEGER NOT NULL DEFAULT 0,
      summary TEXT,
      error TEXT,
      result_json TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL
    )
  `);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_runs_dedupe ON agent_runs(dedupe_key) WHERE status IN ('queued','running','succeeded','awaiting_approval')`);
  await query(`CREATE INDEX IF NOT EXISTS idx_agent_runs_created ON agent_runs(created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_agent_runs_workflow ON agent_runs(workflow_id, created_at DESC)`);

  await query(`
    CREATE TABLE IF NOT EXISTS agent_approvals (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      action_code TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      risk TEXT NOT NULL,
      decided_by TEXT,
      decided_at TEXT,
      created_at TEXT NOT NULL
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_agent_approvals_status ON agent_approvals(status, created_at DESC)`);

  await query(`
    CREATE TABLE IF NOT EXISTS agent_schedules (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL UNIQUE,
      cron_label TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run_at TEXT,
      next_hint TEXT,
      updated_at TEXT NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS agent_alerts (
      id TEXT PRIMARY KEY,
      run_id TEXT REFERENCES agent_runs(id) ON DELETE SET NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_agent_alerts_open ON agent_alerts(acknowledged, created_at DESC)`);

  await query(`
    CREATE TABLE IF NOT EXISTS agent_briefings (
      id TEXT PRIMARY KEY,
      brief_date TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      run_id TEXT REFERENCES agent_runs(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    )
  `);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_briefings_date ON agent_briefings(brief_date)`);

  await query(`
    CREATE TABLE IF NOT EXISTS agent_audit_findings (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
      severity TEXT NOT NULL,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      href TEXT,
      created_at TEXT NOT NULL
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_agent_audit_run ON agent_audit_findings(run_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS streaming_snapshots (
      id TEXT PRIMARY KEY,
      artist_id TEXT NOT NULL,
      snapshot_date TEXT NOT NULL,
      source TEXT NOT NULL,
      monthly_listeners INTEGER,
      followers INTEGER,
      popularity INTEGER,
      note TEXT,
      run_id TEXT REFERENCES agent_runs(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    )
  `);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_streaming_snapshots_day ON streaming_snapshots(artist_id, snapshot_date, source)`);

  await query(`
    CREATE TABLE IF NOT EXISTS integration_health (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      detail TEXT NOT NULL,
      checked_at TEXT NOT NULL
    )
  `);
}
