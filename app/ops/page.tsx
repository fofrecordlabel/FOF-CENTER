import { decideAgentApproval, triggerAgentWorkflow } from "@/lib/agents/actions";
import { bootstrapAgentSchedules, listAgentRoster } from "@/lib/agents/engine";
import { WAVE_ONE } from "@/lib/agents/registry";
import {
  getBriefing,
  listAlerts,
  listApprovals,
  listBriefings,
  listFindings,
  listIntegrations,
  listRuns,
  listSchedules,
  listStreamingSnapshots,
  parseResult,
} from "@/lib/agents/store";
import { SubmitButton } from "@/components/controls";
import { Banner, PageHeader, Pill } from "@/components/ui";
import { ago, today } from "@/lib/format";

export const metadata = { title: "Ops Agents" };

export default async function OpsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  await bootstrapAgentSchedules();
  const [runs, approvals, alerts, integrations, briefing, briefings, findings, schedules, snapshots] = await Promise.all([
    listRuns(30),
    listApprovals(),
    listAlerts(20),
    listIntegrations(),
    getBriefing(today()),
    listBriefings(7),
    listFindings(),
    listSchedules(),
    listStreamingSnapshots(40),
  ]);
  const roster = listAgentRoster();
  const pending = approvals.filter((row) => row.status === "pending");

  return (
    <>
      <PageHeader
        kicker="Automation"
        title="Ops agents"
        lede="Fourteen specialized agents on the FOF desk. Wave 1 runs streaming snapshots, ISRC audits, the daily briefing, and integration health — with retries, dedupe, logs, and approval gates."
      />
      <Banner message={error} />

      <section className="section stats">
        <div className="stat">
          <b>{roster.length}</b>
          <span>Agents</span>
        </div>
        <div className="stat">
          <b>{runs.filter((run) => run.status === "succeeded").length}</b>
          <span>Succeeded (recent)</span>
        </div>
        <div className="stat">
          <b>{pending.length}</b>
          <span>Awaiting approval</span>
        </div>
        <div className="stat">
          <b>{integrations.filter((row) => row.status === "ok").length}/{integrations.length || "—"}</b>
          <span>Integrations ok</span>
        </div>
      </section>

      <section className="section card stack">
        <div className="section-head">
          <h2>Wave 1 — run now</h2>
          <span className="meta">America/New_York desk date {today()}</span>
        </div>
        <div className="form-grid">
          {WAVE_ONE.map((workflowId) => {
            const agent = roster.find((row) => row.workflows.some((workflow) => workflow.id === workflowId));
            const workflow = agent?.workflows.find((row) => row.id === workflowId);
            return (
              <form action={triggerAgentWorkflow} key={workflowId} className="sheet">
                <input type="hidden" name="workflow_id" value={workflowId} />
                <strong>{workflow?.name ?? workflowId}</strong>
                <p className="meta">{agent?.name} · {workflow?.schedule}</p>
                <div className="actions">
                  <label className="meta">
                    <input type="checkbox" name="dry_run" value="1" /> Dry run
                  </label>
                  <label className="meta">
                    <input type="checkbox" name="force" value="1" /> Force
                  </label>
                  <SubmitButton className="btn primary small" label="Run" />
                </div>
              </form>
            );
          })}
        </div>
      </section>

      {briefing ? (
        <section className="section card stack">
          <div className="section-head">
            <h2>Today’s briefing</h2>
            <Pill tone="good">Saved</Pill>
          </div>
          <pre className="briefing">{briefing.body}</pre>
        </section>
      ) : (
        <section className="section card">
          <h2>Today’s briefing</h2>
          <p className="meta">No briefing saved for {today()} yet. Run Daily executive briefing.</p>
        </section>
      )}

      <section className="section grid-2">
        <article className="card stack">
          <div className="section-head">
            <h2>Integration health</h2>
          </div>
          {integrations.length ? (
            integrations.map((row) => (
              <div className="line" key={row.id}>
                <div>
                  <strong>{row.name}</strong>
                  <span>{row.detail}</span>
                </div>
                <Pill tone={healthTone(row.status)}>{row.status}</Pill>
              </div>
            ))
          ) : (
            <p className="meta">Run Integration health monitoring to populate this board.</p>
          )}
        </article>
        <article className="card stack">
          <div className="section-head">
            <h2>Approval gates</h2>
          </div>
          {pending.length ? (
            pending.map((row) => (
              <div className="sheet" key={row.id}>
                <strong>{row.title}</strong>
                <p className="meta">{row.detail}</p>
                <p className="meta">Risk {row.risk} · {ago(row.created_at)}</p>
                <div className="actions">
                  <form action={decideAgentApproval}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <SubmitButton className="btn primary small" label="Record approval" />
                  </form>
                  <form action={decideAgentApproval}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <SubmitButton className="btn danger small" label="Reject" />
                  </form>
                </div>
                <p className="meta">Recording approval does not auto-execute side effects yet — by design.</p>
              </div>
            ))
          ) : (
            <p className="meta">No pending approvals.</p>
          )}
        </article>
      </section>

      <section className="section card">
        <div className="section-head">
          <h2>Execution log</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Workflow</th>
                <th>Status</th>
                <th>Attempt</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td data-label="When">{ago(run.created_at)}</td>
                  <td data-label="Workflow">{run.workflow_id}</td>
                  <td data-label="Status">
                    <Pill tone={runTone(run.status)}>{run.status}</Pill>
                  </td>
                  <td data-label="Attempt">{run.attempt}</td>
                  <td data-label="Summary">{run.summary || run.error || "—"}</td>
                </tr>
              ))}
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={5}>No agent runs yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section grid-2">
        <article className="card stack">
          <h2>Streaming snapshots</h2>
          {snapshots.length ? (
            snapshots.slice(0, 12).map((row) => (
              <div className="line" key={row.id}>
                <div>
                  <strong>{row.snapshot_date}</strong>
                  <span>
                    {row.source}
                    {row.monthly_listeners != null ? ` · ${row.monthly_listeners.toLocaleString("en-US")} listeners` : " · listeners unavailable"}
                    {row.note ? ` · ${row.note}` : ""}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="meta">No snapshots yet.</p>
          )}
        </article>
        <article className="card stack">
          <h2>Recent findings</h2>
          {findings.slice(0, 12).map((row) => (
            <div className="line" key={row.id}>
              <div>
                <strong>{row.title}</strong>
                <span>{row.detail}</span>
              </div>
              <Pill tone={row.severity === "critical" ? "high" : row.severity === "warn" ? "rush" : "mute"}>{row.severity}</Pill>
            </div>
          ))}
          {findings.length === 0 ? <p className="meta">No findings stored yet.</p> : null}
        </article>
      </section>

      <section className="section card stack">
        <div className="section-head">
          <h2>Agent roster</h2>
        </div>
        {roster.map((agent) => (
          <div className="sheet" key={agent.id}>
            <div className="section-head">
              <h3>{agent.name}</h3>
              <span className="meta">{agent.id}</span>
            </div>
            <p className="meta">{agent.mandate}</p>
            <p className="meta">
              Guards: no spend · no publish · no sign · no ownership changes
            </p>
            {agent.workflows.map((workflow) => {
              const schedule = schedules.find((row) => row.workflow_id === workflow.id);
              return (
                <form action={triggerAgentWorkflow} key={workflow.id} className="line">
                  <input type="hidden" name="workflow_id" value={workflow.id} />
                  <div>
                    <strong>{workflow.name}</strong>
                    <span>
                      {workflow.schedule}
                      {schedule?.last_run_at ? ` · last ${ago(schedule.last_run_at)}` : ""}
                      {workflow.requiresApproval ? " · approval gate" : ""}
                      {workflow.enabled ? "" : " · disabled"}
                    </span>
                  </div>
                  <SubmitButton className="btn small" label="Run" />
                </form>
              );
            })}
          </div>
        ))}
      </section>

      <section className="section card stack">
        <h2>Failure alerts</h2>
        {alerts.length ? (
          alerts.map((alert) => (
            <div className="line" key={alert.id}>
              <div>
                <strong>{alert.title}</strong>
                <span>{alert.detail}</span>
              </div>
              <Pill tone={alert.severity === "critical" ? "high" : "mute"}>{alert.severity}</Pill>
            </div>
          ))
        ) : (
          <p className="meta">No agent alerts.</p>
        )}
      </section>

      {briefings.length > 1 ? (
        <section className="section card stack">
          <h2>Prior briefings</h2>
          {briefings
            .filter((row) => row.brief_date !== today())
            .map((row) => (
              <details key={row.id} className="drawer">
                <summary>
                  {row.title} · {row.brief_date}
                </summary>
                <pre className="briefing">{row.body}</pre>
              </details>
            ))}
        </section>
      ) : null}

      <section className="section card">
        <h2>Latest run detail</h2>
        {runs[0] ? (
          <pre className="briefing">{JSON.stringify(parseResult(runs[0].result_json) ?? { summary: runs[0].summary, error: runs[0].error }, null, 2)}</pre>
        ) : (
          <p className="meta">Nothing to show.</p>
        )}
      </section>
    </>
  );
}

function healthTone(status: string) {
  if (status === "ok") return "good";
  if (status === "degraded") return "sky";
  if (status === "misconfigured") return "high";
  return "mute";
}

function runTone(status: string) {
  if (status === "succeeded") return "good";
  if (status === "failed") return "high";
  if (status === "awaiting_approval") return "rush";
  if (status === "running" || status === "queued") return "sky";
  return "mute";
}
