import { saveBriefing } from "@/lib/agents/store";
import type { Finding, WorkflowContext, WorkflowResult } from "@/lib/agents/types";
import { validateIsrcFormat } from "@/lib/agents/isrc";
import {
  comingReleases,
  dashboard,
  dueProjects,
  listListenerLogs,
  listTodos,
  listTrackViews,
} from "@/lib/db";
import { dayStats } from "@/lib/checklist";
import { money, today } from "@/lib/format";

export async function runDailyExecutiveBriefing(ctx: WorkflowContext): Promise<WorkflowResult> {
  const desk = await dashboard();
  const todos = await listTodos();
  const todayTodos = todos.filter((todo) => todo.todo_date === ctx.deskDate);
  const checks = dayStats(todayTodos);
  const listeners = await listListenerLogs();
  const tracks = await listTrackViews();
  const coming = await comingReleases();
  const due = await dueProjects();

  const missingListeners = desk.snaps
    .map((row) => row.artist)
    .filter((artist) => !listeners.some((log) => log.artist_id === artist.id && log.log_date === ctx.deskDate));

  const isrcGaps = tracks.filter((track) => validateIsrcFormat(track.isrc)).length;

  const lines: string[] = [];
  lines.push(`# FOF Records daily briefing — ${ctx.deskDate}`);
  lines.push("");
  lines.push("## Desk pulse");
  lines.push(`- Roster: ${desk.rosterCount} · Pipeline: ${desk.pipelineCount} · Offer/legal: ${desk.offerCount}`);
  lines.push(`- Unrecouped: ${money(desk.unrecouped)} · Past recoupment: ${money(desk.payable)}`);
  lines.push(`- Checklist today: ${checks.done}/${checks.total} (${checks.percent}%)`);
  lines.push("");
  lines.push("## Streaming");
  if (missingListeners.length) {
    lines.push(`- Missing today’s listener log: ${missingListeners.map((artist) => artist.name).join(", ")}`);
  } else if (desk.rosterCount === 0) {
    lines.push("- No roster artists on file.");
  } else {
    lines.push("- Every roster/desk artist has a listener log for today (or no artists need one).");
  }
  lines.push("");
  lines.push("## Catalog / rights");
  lines.push(`- Tracks with ISRC format issues or blanks: ${isrcGaps}`);
  lines.push("");
  lines.push("## Calendar");
  if (coming.length) {
    for (const release of coming.slice(0, 8)) {
      lines.push(`- Release ${release.title} (${release.artist_name}) — ${release.status}${release.release_date ? ` · ${release.release_date}` : ""}`);
    }
  } else {
    lines.push("- No dated releases in production/scheduled/delivered.");
  }
  if (due.length) {
    for (const project of due.slice(0, 8)) {
      lines.push(`- Budget ${project.name}${project.overdue ? " OVERDUE" : ""} due ${project.due_date}`);
    }
  }
  lines.push("");
  lines.push("## Decisions waiting");
  if (desk.hot.length) {
    for (const artist of desk.hot.slice(0, 8)) {
      lines.push(`- ${artist.name} · ${artist.stage} · priority ${artist.priority}`);
    }
  } else {
    lines.push("- Pipeline is quiet.");
  }
  lines.push("");
  lines.push("## Guardrails");
  lines.push("- This briefing is read-only. It does not publish releases, spend money, alter ownership, or sign contracts.");
  lines.push(`- Generated ${new Date().toISOString()} (desk date ${today()}).`);

  const body = lines.join("\n");
  const findings: Finding[] = [];
  for (const artist of missingListeners) {
    findings.push({
      severity: "warn",
      code: "BRIEF_MISSING_LISTENERS",
      title: `Log listeners for ${artist.name}`,
      detail: `No listener_logs row for ${ctx.deskDate}`,
      entityType: "artist",
      entityId: artist.id,
      href: "/#listeners",
    });
  }
  if (isrcGaps) {
    findings.push({
      severity: "warn",
      code: "BRIEF_ISRC_GAPS",
      title: `${isrcGaps} tracks need ISRC attention`,
      detail: "Run the ISRC & metadata audit for the full list.",
      href: "/ops",
    });
  }
  if (desk.offerCount) {
    findings.push({
      severity: "info",
      code: "BRIEF_OFFERS",
      title: `${desk.offerCount} artists in offer or legal`,
      detail: "Chief of Staff flags these for human decision only.",
      href: "/pipeline",
    });
  }

  if (!ctx.dryRun) {
    await saveBriefing(ctx.deskDate, `Daily briefing ${ctx.deskDate}`, body, ctx.runId);
  }

  return {
    summary: `Executive briefing for ${ctx.deskDate}: checklist ${checks.done}/${checks.total}, ${missingListeners.length} missing listener logs, ${isrcGaps} ISRC gaps.`,
    findings,
    sources: [
      {
        id: "desk-operational-data",
        status: "ok",
        detail: "Compiled only from FOF desk Postgres data. No fabricated metrics.",
      },
    ],
    metrics: {
      checklistDone: checks.done,
      checklistTotal: checks.total,
      missingListeners: missingListeners.length,
      isrcGaps,
      hotArtists: desk.hot.length,
    },
    artifacts: [{ kind: "briefing", title: `Daily briefing ${ctx.deskDate}`, body }],
  };
}
