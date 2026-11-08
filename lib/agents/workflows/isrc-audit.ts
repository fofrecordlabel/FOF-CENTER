import { findDuplicateIsrcs, normalizeIsrc, validateIsrcFormat, validateUpc } from "@/lib/agents/isrc";
import type { Finding, WorkflowContext, WorkflowResult } from "@/lib/agents/types";
import { listReleaseViews, listTrackViews } from "@/lib/db";

export async function runIsrcMetadataAudit(_ctx: WorkflowContext): Promise<WorkflowResult> {
  const tracks = await listTrackViews();
  const releases = await listReleaseViews();
  const findings: Finding[] = [];

  for (const track of tracks) {
    const formatIssue = validateIsrcFormat(track.isrc);
    if (formatIssue) {
      findings.push({
        severity: formatIssue.code === "missing" ? "warn" : "critical",
        code: `ISRC_${formatIssue.code.toUpperCase()}`,
        title: `${track.title}: ${formatIssue.message}`,
        detail: [
          track.artist_name,
          track.release_title ? `Release ${track.release_title}` : "No release linked",
          track.isrc ? `Raw value: ${track.isrc}` : "Empty ISRC",
        ].join(" · "),
        entityType: "track",
        entityId: track.id,
        href: track.release_id ? `/releases/${track.release_id}` : "/catalog",
      });
    }
    if (!track.writer_ipis?.trim()) {
      findings.push({
        severity: "warn",
        code: "IPI_MISSING",
        title: `${track.title}: writer IPI missing`,
        detail: `${track.artist_name} · writers: ${track.writers || "none listed"}`,
        entityType: "track",
        entityId: track.id,
        href: track.release_id ? `/releases/${track.release_id}` : "/catalog",
      });
    }
    if (!track.writers?.trim()) {
      findings.push({
        severity: "warn",
        code: "WRITERS_MISSING",
        title: `${track.title}: writers missing`,
        detail: track.artist_name,
        entityType: "track",
        entityId: track.id,
        href: track.release_id ? `/releases/${track.release_id}` : "/catalog",
      });
    }
    if (!track.master_owner?.trim()) {
      findings.push({
        severity: "info",
        code: "MASTER_OWNER_MISSING",
        title: `${track.title}: master owner blank`,
        detail: track.artist_name,
        entityType: "track",
        entityId: track.id,
      });
    }
  }

  for (const dup of findDuplicateIsrcs(tracks)) {
    findings.push({
      severity: "critical",
      code: "ISRC_DUPLICATE",
      title: `Duplicate ISRC ${normalizeIsrc(dup.isrc)}`,
      detail: dup.tracks.map((track) => track.title).join(" · "),
      entityType: "isrc",
      entityId: normalizeIsrc(dup.isrc),
      href: "/catalog",
    });
  }

  for (const release of releases) {
    const upc = validateUpc(release.upc);
    if (!upc.ok) {
      findings.push({
        severity: release.status === "released" || release.status === "scheduled" ? "critical" : "warn",
        code: "UPC_INVALID",
        title: `${release.title}: ${upc.message}`,
        detail: `${release.artist_name} · status ${release.status}`,
        entityType: "release",
        entityId: release.id,
        href: `/releases/${release.id}`,
      });
    }
    if (!release.distributor) {
      findings.push({
        severity: "info",
        code: "DISTRIBUTOR_MISSING",
        title: `${release.title}: distributor missing`,
        detail: release.artist_name,
        entityType: "release",
        entityId: release.id,
        href: `/releases/${release.id}`,
      });
    }
  }

  const critical = findings.filter((finding) => finding.severity === "critical").length;
  const warn = findings.filter((finding) => finding.severity === "warn").length;

  return {
    summary: `Catalog audit: ${tracks.length} tracks, ${releases.length} releases → ${critical} critical, ${warn} warnings.`,
    findings,
    sources: [
      {
        id: "desk-catalog",
        status: "ok",
        detail: "Audited tracks/releases already stored on the FOF desk. No external registry calls (ISRC/UPC ownership not verified remotely).",
      },
    ],
    metrics: {
      tracks: tracks.length,
      releases: releases.length,
      critical,
      warnings: warn,
      missingIsrc: findings.filter((finding) => finding.code === "ISRC_MISSING").length,
      duplicateIsrc: findings.filter((finding) => finding.code === "ISRC_DUPLICATE").length,
    },
  };
}
