import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteRelease, deleteTrack } from "@/lib/actions";
import { ChecklistLine } from "@/components/Checklist";
import { ConfirmSubmit } from "@/components/controls";
import { ReleaseForm, TrackForm } from "@/components/RecordForms";
import { DistributorPick, ReleaseStatus } from "@/components/ReleaseMarks";
import { CoverUpload, MasterAudio } from "@/components/SongMedia";
import { Banner, Mono, PageHeader } from "@/components/ui";
import { getRelease, listTodos, listTracksForRelease } from "@/lib/db";
import { duration, formatIsrc, money, prettyDate } from "@/lib/format";
import { RELEASE_TYPES, labelFor } from "@/lib/labels";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const release = await getRelease(id);
  return { title: release?.title ?? "Release" };
}

export default async function ReleasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const release = await getRelease(id);
  if (!release) notFound();
  const tracks = await listTracksForRelease(id);
  const lines = (await listTodos()).filter((todo) => todo.release_id === id);
  const next = `/releases/${id}`;

  return (
    <>
      <Banner message={error} />
      <PageHeader
        kicker={release.artist_name}
        title={release.title}
        lede={[labelFor(RELEASE_TYPES, release.release_type), release.catalog_no, release.imprint, release.distributor].filter(Boolean).join(" · ")}
      >
        <DistributorPick id={release.id} distributor={release.distributor} next={next} />
        <ReleaseStatus id={release.id} status={release.status} next={next} />
        <Link className="btn" href={`/artists/${release.artist_id}`}>Artist file</Link>
        <Link className="btn" href="/art">3000×3000 art</Link>
      </PageHeader>
      <div className="who" style={{ marginBottom: 16 }}>
        <Mono name={release.title} image={release.cover_url} large />
        <CoverUpload releaseId={release.id} />
        <div className="meta">
          <div>{release.release_date ? prettyDate(release.release_date) : "No street date"}</div>
          <div>{release.upc ? `UPC ${release.upc}` : "No UPC"}</div>
          <div>Budget {money(release.budget_cents)}</div>
        </div>
      </div>
      {release.notes ? <p className="lede">{release.notes}</p> : null}
      <section className="section stack">
        <h2>Masters</h2>
        {tracks.map((track) => (
          <article className="card" key={track.id}>
            <div className="track">
              <strong>{track.track_number ? `${track.track_number}. ` : ""}{track.title}</strong>
              <span className="meta">{duration(track.duration_sec)}{track.explicit ? " · E" : ""}</span>
              <p className="sub">
                {[track.isrc ? `ISRC ${formatIsrc(track.isrc)}` : "ISRC needed", track.writer_ipis ? `IPI ${track.writer_ipis}` : "IPI needed", track.writers ? `W ${track.writers}` : "", track.producers ? `P ${track.producers}` : "", track.master_owner, track.publishing].filter(Boolean).join(" · ")}
              </p>
            </div>
            <MasterAudio trackId={track.id} src={track.audio_url} />
            {track.notes ? <p className="meta">{track.notes}</p> : null}
            <details className="drawer">
              <summary>Edit master</summary>
              <TrackForm artistId={release.artist_id} releases={[{ id: release.id, title: release.title }]} releaseId={release.id} track={track} next={next} />
            </details>
            <form action={deleteTrack}>
              <input type="hidden" name="id" value={track.id} />
              <input type="hidden" name="next" value={next} />
              <ConfirmSubmit className="btn danger small" label="Delete master" message={`Delete ${track.title}?`} />
            </form>
          </article>
        ))}
        <details className="drawer card">
          <summary>Add a master</summary>
          <TrackForm artistId={release.artist_id} releases={[{ id: release.id, title: release.title }]} releaseId={release.id} next={next} />
        </details>
      </section>
      <section className="section card stack">
        <div className="section-head">
          <h2>Checklist</h2>
          <Link href="/checklist">All days</Link>
        </div>
        {lines.length === 0 ? <p className="meta">No checklist line is tied to this release yet.</p> : null}
        {lines.map((todo) => (
          <ChecklistLine key={todo.id} todo={todo} next={next} releases={[{ id: release.id, title: release.title }]} />
        ))}
      </section>
      <section className="section card stack">
        <h2>Edit release</h2>
        <ReleaseForm artistId={release.artist_id} release={release} next={next} stay />
        <form action={deleteRelease}>
          <input type="hidden" name="id" value={release.id} />
          <input type="hidden" name="next" value={`/artists/${release.artist_id}`} />
          <ConfirmSubmit className="btn danger" label="Delete release" message={`Delete ${release.title} and its masters?`} />
        </form>
      </section>
    </>
  );
}
