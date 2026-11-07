import Link from "next/link";
import { ReleaseForm } from "@/components/RecordForms";
import { DistributorPick, ReleaseStatus } from "@/components/ReleaseMarks";
import { Banner, Mono, PageHeader } from "@/components/ui";
import { listArtists, listReleaseViews } from "@/lib/db";
import { money, prettyDate } from "@/lib/format";
import { RELEASE_STATUSES, RELEASE_TYPES, labelFor } from "@/lib/labels";

export const metadata = { title: "Releases" };

export default async function ReleasesPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const { status, error } = await searchParams;
  const current = RELEASE_STATUSES.some((item) => item.value === status) ? status : "all";
  const releases = (await listReleaseViews()).filter((release) => current === "all" || release.status === current);
  const artists = (await listArtists()).map((artist) => ({ id: artist.id, name: artist.name }));

  return (
    <>
      <PageHeader kicker="Release schedule" title="Releases" lede="Singles, EPs, and albums. Street date, catalog number, and who it belongs to." />
      <Banner message={error} />
      <div className="filters">
        <Link className={current === "all" ? "pill acid" : "pill"} href="/releases">All</Link>
        {RELEASE_STATUSES.map((item) => (
          <Link key={item.value} className={current === item.value ? "pill acid" : "pill"} href={`/releases?status=${item.value}`}>
            {item.label}
          </Link>
        ))}
      </div>
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
              <tr key={release.id}>
                <td data-label="Release">
                  <div className="release-cell">
                    <Mono name={release.title} image={release.cover_url} />
                    <div>
                      <Link className="rowlink" href={`/releases/${release.id}`}>{release.title}</Link>
                      <div className="meta">{[labelFor(RELEASE_TYPES, release.release_type), release.catalog_no].filter(Boolean).join(" · ")}</div>
                    </div>
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
