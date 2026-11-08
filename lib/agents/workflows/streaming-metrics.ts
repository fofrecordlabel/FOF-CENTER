import { collectStreamingMetrics } from "@/lib/agents/collectors/streaming";
import { upsertStreamingSnapshot } from "@/lib/agents/store";
import type { Finding, WorkflowContext, WorkflowResult } from "@/lib/agents/types";
import { syncListeners } from "@/lib/db";
import { insert, uid } from "@/lib/sql";

export async function runDailyStreamingMetrics(ctx: WorkflowContext): Promise<WorkflowResult> {
  const { rows, sources } = await collectStreamingMetrics(ctx.deskDate);
  const findings: Finding[] = [];
  let written = 0;
  let missingToday = 0;

  for (const row of rows) {
    if (row.monthlyListeners == null) {
      missingToday += 1;
      findings.push({
        severity: "warn",
        code: "STREAMING_MISSING",
        title: `No monthly listeners for ${row.artistName}`,
        detail: row.note,
        entityType: "artist",
        entityId: row.artistId,
        href: `/artists/${row.artistId}`,
      });
    } else if (row.source === "desk-log-stale") {
      findings.push({
        severity: "warn",
        code: "STREAMING_STALE",
        title: `${row.artistName} has no log for ${ctx.deskDate}`,
        detail: row.note,
        entityType: "artist",
        entityId: row.artistId,
        href: "/#listeners",
      });
    }

    if (!ctx.dryRun) {
      await upsertStreamingSnapshot({
        artistId: row.artistId,
        snapshotDate: ctx.deskDate,
        source: row.source,
        monthlyListeners: row.monthlyListeners,
        followers: row.followers,
        popularity: row.popularity,
        note: row.note,
        runId: ctx.runId,
      });
      written += 1;

      // Only write into listener_logs when Chartmetric provided an authorized number
      // and there is no desk log yet for today — never overwrite a human entry.
      if (row.source === "chartmetric" && row.monthlyListeners != null) {
        const { query } = await import("@/lib/pg");
        const existing = await query<{ id: string }>(
          "SELECT id FROM listener_logs WHERE artist_id = ? AND log_date = ? LIMIT 1",
          [row.artistId, ctx.deskDate]
        );
        if (!existing[0]) {
          await insert("listener_logs", {
            id: uid(),
            artist_id: row.artistId,
            log_date: ctx.deskDate,
            listeners: row.monthlyListeners,
            note: "Imported from Chartmetric by Streaming Intelligence (authorized).",
            created_at: new Date().toISOString(),
          });
          await syncListeners(row.artistId);
        }
      }
    }
  }

  const officialGap = sources.find((source) => source.id === "spotify-web-api");
  if (officialGap && officialGap.status !== "ok") {
    findings.push({
      severity: "info",
      code: "SPOTIFY_NO_MONTHLY",
      title: "Spotify Web API cannot supply monthly listeners",
      detail: officialGap.detail,
    });
  }

  return {
    summary: ctx.dryRun
      ? `Dry run: ${rows.length} artists inspected, ${missingToday} missing today’s number.`
      : `Streaming snapshots written for ${written} artists. ${missingToday} missing today’s monthly listeners.`,
    findings,
    sources,
    metrics: {
      artists: rows.length,
      written: ctx.dryRun ? 0 : written,
      missingToday,
      chartmetricRows: rows.filter((row) => row.source === "chartmetric").length,
      deskLogRows: rows.filter((row) => row.source === "desk-log").length,
    },
  };
}
