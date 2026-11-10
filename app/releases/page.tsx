import Link from "next/link";
import { ReleaseForm } from "@/components/RecordForms";
import { ReleasePlay } from "@/components/ReleasePlay";
import { MasterAdd } from "@/components/SongMedia";
import { DistributorPick, ReleaseStatus } from "@/components/ReleaseMarks";
import { OpenRegistrations } from "@/components/TrackOps";
import { Banner, Mono, PageHeader } from "@/components/ui";
import { listArtists, listReleaseChecks, listReleaseMasters, listReleaseViews } from "@/lib/db";
import { money, prettyDate } from "@/lib/format";
import { RELEASE_STATUSES, RELEASE_TYPES, labelFor, statusTone } from "@/lib/labels";

export const metadata = { title: "Releases" };

export default async function ReleasesPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const { status, error } = await searchParams;
  const current = RELEASE_STATUSES.some((item) => item.value === status) ? status : "all";
  const [releaseRows, masterRows, artistRows, checkRows] = await Promise.all([
    listReleaseViews(),
    listReleaseMasters(),
    listArtists(),
    listReleaseChecks(),
  ]);
  const releases = releaseRows.filter((release) => current === "all" || release.status === current);
  const masters = new Map<string, { title: string; src: string }[]>();
  const openTrack = new Map<string, string>();
  for (const master of masterRows) {
    if (master.audio_url) {
      const list = masters.get(master.release_id) ?? [];
      list.push({ title: master.title, src: master.audio_url });
      masters.set(master.release_id, list);
    } else if (!openTrack.has(master.release_id)) {
      openTrack.set(master.release_id, master.id);
    }
  }
  const artists = artistRows.map((artist) => ({ id: artist.id, name: artist.name }));
  const checks = new Map(checkRows.map((row) => [row.release_id, row]));

  return (
    <>
      <PageHeader kicker="Release schedule" title="Releases" lede="Singles, EPs, and albums. Street date, catalog number, and who it belongs to." />
      <Banner message={error} />
      <div className="filters">
        <Link className={current === "all" ? "pill acid on" : "pill"} href="/releases">All</Link>
        {RELEASE_STATUSES.map((item) => (
          <Link key={item.value} className={`pill ${statusTone(item.value)}${current === item.value ? " on" : ""}`} href={`/releases?status=${item.value}`}>
            {item.label}
          </Link>
        ))}
      </div>
      <OpenRegistrations />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Release</th>
              <th>Artist</th>
              <th>Status</th>
              <th>Date</th>
              <th className="num">Budget</th>
            </tr>
          </thead>
          <tbody>
            {releases.map((release) => (
              <tr className={statusTone(release.status)} key={release.id}>
                <td data-label="Release">
                  <div className="release-cell">
                    <Link className="release-open" href={`/releases/${release.id}`} aria-label={`Open ${release.title}`}>
                      <span className={`cover-ring ${statusTone(release.status)}`}>
                        <Mono name={release.title} image={release.cover_url} />
                      </span>
                    </Link>
                    {masters.get(release.id)?.length ? (
                      <ReleasePlay releaseId={release.id} title={release.title} tracks={masters.get(release.id) ?? []} />
                    ) : (
                      <MasterAdd releaseId={release.id} trackId={openTrack.get(release.id)} title={release.title} compact />
                    )}
                    <Link className="release-open release-name" href={`/releases/${release.id}`}>
                      <span className="rowlink">{release.title}</span>
                      <span className="meta">{[labelFor(RELEASE_TYPES, release.release_type), release.catalog_no].filter(Boolean).join(" · ")}</span>
                      {Number(checks.get(release.id)?.bmi ?? 0) === 1 ? <span className="pill good">BMI</span> : <span className="pill down">Not on BMI</span>}
                    </Link>
                  </div>
                </td>
                <td data-label="Artist"><Link className="rowlink" href={`/artists/${release.artist_id}`}>{release.artist_name}</Link></td>
                <td data-label="Status">
                  <div className="release-tools">
                    <ReleaseStatus id={release.id} status={release.status} next="/releases" />
                    <DistributorPick id={release.id} distributor={release.distributor} next="/releases" />
                  </div>
                </td>
                <td data-label="Date">{prettyDate(release.release_date)}</td>
                <td className="num" data-label="Budget">{money(release.budget_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {releases.length === 0 ? <p className="meta">Nothing in this lane.</p> : null}
      <section className="section card stack">
        <h2>Add a release</h2>
        <ReleaseForm artists={artists} next="/releases" />
      </section>
    </>
  );
}
