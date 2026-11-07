import Link from "next/link";
import { deleteRoyalty, deleteTrack } from "@/lib/actions";
import { ConfirmSubmit } from "@/components/controls";
import { CampaignBlock, DeliveryChecks, SplitList } from "@/components/ReleaseOps";
import { CoverUpload, MasterAudio } from "@/components/SongMedia";
import { RegistrationMarks, TakedownControls } from "@/components/TrackOps";
import { RoyaltyForm, TrackForm } from "@/components/RecordForms";
import { Balance, Banner, Mono, PageHeader, Pill } from "@/components/ui";
import { listArtists, listBookings, listCampaigns, listInfluencers, listReleaseViews, listRoyaltyViews, listSplits, listTakedowns, listTrackViews, rosterRows } from "@/lib/db";
import { duration, formatIsrc, initials, money, prettyDate } from "@/lib/format";
import { RELEASE_STATUSES, RELEASE_TYPES, ROYALTY_SOURCES, STORES, labelFor, statusTone } from "@/lib/labels";

export const metadata = { title: "Catalog" };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const releases = await listReleaseViews();
  const tracks = await listTrackViews();
  const royalties = await listRoyaltyViews();
  const artists = (await listArtists()).map((artist) => ({ id: artist.id, name: artist.name }));
  const releaseOptions = releases.map((release) => ({ id: release.id, title: release.title, artist_name: release.artist_name }));
  const roster = await rosterRows();
  const looseTracks = tracks.filter((track) => !track.release_id);
  const looseRoyalties = royalties.filter((line) => !line.release_id);
  const splits = await listSplits();
  const campaigns = await listCampaigns();
  const bookings = await listBookings();
  const influencers = await listInfluencers();
  const takedowns = await listTakedowns();
  const stillDown = takedowns.filter((row) => !row.restored_at);

  return (
    <>
      <PageHeader
        kicker="Masters and royalties"
        title="Catalog"
        lede="Every cover, the recordings on it, the split, the promo, and the money. One page."
      >
        <Link className="btn" href="/art">
          Make a cover
        </Link>
        <Link className="btn primary" href="/releases">
          Add a release
        </Link>
      </PageHeader>
      <Banner message={error} />
      {stillDown.length ? (
        <section className="card stack">
          <h2>Put these back up</h2>
          {stillDown.map((row) => {
            const track = tracks.find((item) => item.id === row.track_id);
            return (
              <a className="meta" href={`#trk-${row.track_id}`} key={row.id}>
                {track?.title ?? "Song"} is down on {labelFor(STORES, row.store)} since {prettyDate(row.taken_down_at)}
              </a>
            );
          })}
        </section>
      ) : null}

      {roster.length ? (
        <section className="stats catalog-money">
          {roster.map((row) => (
            <Link className="stat" href={`/artists/${row.artist.id}`} key={row.artist.id}>
              <Mono name={row.artist.name} image={row.artist.image_url} />
              <b>{row.artist.name}</b>
              <span>
                Gross {money(row.gross)} · <Balance cents={row.balance} />
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      {releases.length === 0 ? (
        <section className="sheet">
          <div className="cover-frame">
            <img className="cover-logo" src="/brand/fof.png" alt="FOF Records" />
          </div>
          <div className="sheet-copy">
            <p className="kicker">The wall</p>
            <h2>Nothing on the wall yet</h2>
            <p className="lede">Add a release, set the cover, then the masters and the statements sit beside it.</p>
            <div className="actions">
              <Link className="btn primary" href="/releases">
                Add a release
              </Link>
              <Link className="btn" href="/art">
                3000×3000 cover
              </Link>
            </div>
          </div>
        </section>
      ) : (
        releases.map((release) => {
          const masters = tracks.filter((track) => track.release_id === release.id);
          const lines = royalties.filter((line) => line.release_id === release.id);
          const gross = lines.reduce((sum, line) => sum + line.gross_cents, 0);
          const campaign = campaigns.find((item) => item.release_id === release.id) ?? null;
          return (
            <section className={release.status === "released" ? "sheet is-live" : "sheet"} id={`rel-${release.id}`} key={release.id}>
              <div className="sheet-art">
                <div className="cover-frame">
                  {release.cover_url ? <img src={release.cover_url} alt={release.title} /> : <span className="cover-fallback">{initials(release.title)}</span>}
                </div>
                <div className="actions">
                  <CoverUpload releaseId={release.id} />
                  <Link className="btn small" href="/art">
                    Adjust 3000×3000
                  </Link>
                </div>
              </div>
              <div className="sheet-copy">
                <div className="section-head">
                  <div>
                    <p className="kicker">
                      <Link href={`/artists/${release.artist_id}`}>{release.artist_name}</Link>
                      {" · "}
                      {labelFor(RELEASE_TYPES, release.release_type)}
                    </p>
                    <h2>{release.title}</h2>
                    <p className="meta">
                      {[release.catalog_no, release.upc ? `UPC ${release.upc}` : "", release.release_date ? prettyDate(release.release_date) : "No date", release.imprint || "FOF Records"]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Pill tone={statusTone(release.status)}>{labelFor(RELEASE_STATUSES, release.status)}</Pill>
                </div>

                <DeliveryChecks release={release} masters={masters} />

                <div className="sheet-block">
                  <div className="section-head">
                    <h3>Masters</h3>
                    <span className="meta">{masters.length}</span>
                  </div>
                  {masters.length === 0 ? <p className="meta">No masters on this cover yet.</p> : null}
                  {masters.map((track) => (
                    <div className="master-line" id={`trk-${track.id}`} key={track.id}>
                      <div>
                        <strong>
                          {track.track_number ? `${track.track_number}. ` : ""}
                          {track.title}
                          {track.explicit ? <span className="meta"> · Explicit</span> : null}
                        </strong>
                        <p className="meta">
                          {track.isrc ? `ISRC ${formatIsrc(track.isrc)}` : "ISRC needed"}
                          {" · "}
                          {track.writer_ipis ? `IPI ${track.writer_ipis}` : "IPI needed"}
                          {" · "}
                          {duration(track.duration_sec)}
                        </p>
                        <RegistrationMarks track={track} />
                        {track.writers || track.producers ? (
                          <p className="meta">{[track.writers ? `W ${track.writers}` : "", track.producers ? `P ${track.producers}` : ""].filter(Boolean).join(" · ")}</p>
                        ) : null}
                        <SplitList trackId={track.id} splits={splits} next="/catalog" />
                        <MasterAudio trackId={track.id} src={track.audio_url} />
                        <TakedownControls trackId={track.id} rows={takedowns.filter((row) => row.track_id === track.id)} />
                      </div>
                      <form action={deleteTrack}>
                        <input type="hidden" name="id" value={track.id} />
                        <input type="hidden" name="next" value="/catalog" />
                        <ConfirmSubmit className="btn danger small" label="Delete" message={`Delete ${track.title}?`} />
                      </form>
                    </div>
                  ))}
                  <details className="drawer">
                    <summary>Add a master to this cover</summary>
                    <TrackForm artistId={release.artist_id} releases={releaseOptions} releaseId={release.id} next="/catalog" />
                  </details>
                </div>

                <div className="sheet-block">
                  <div className="section-head">
                    <h3>Royalties</h3>
                    <span className="meta">Gross {money(gross)}</span>
                  </div>
                  {lines.length === 0 ? <p className="meta">No statements on this cover yet.</p> : null}
                  {lines.map((line) => (
                    <div className="master-line" key={line.id}>
                      <div>
                        <strong>
                          {line.period} · {labelFor(ROYALTY_SOURCES, line.source)}
                        </strong>
                        <p className="meta">
                          Gross {money(line.gross_cents)} · Applied {money(line.recoup_cents)}
                        </p>
                        {line.notes ? <p className="meta">{line.notes}</p> : null}
                      </div>
                      <form action={deleteRoyalty}>
                        <input type="hidden" name="id" value={line.id} />
                        <input type="hidden" name="next" value="/catalog" />
                        <ConfirmSubmit className="btn danger small" label="Delete" message={`Delete the ${line.period} statement?`} />
                      </form>
                    </div>
                  ))}
                  <details className="drawer">
                    <summary>Log money on this cover</summary>
                    <RoyaltyForm artistId={release.artist_id} releases={releaseOptions} releaseId={release.id} next="/catalog" />
                  </details>
                </div>

                <CampaignBlock
                  release={release}
                  campaign={campaign}
                  bookings={bookings.filter((booking) => booking.campaign_id === campaign?.id)}
                  influencers={influencers.filter((person) => person.kind !== "curator")}
                  next="/catalog"
                />
              </div>
            </section>
          );
        })
      )}

      {looseTracks.length || looseRoyalties.length ? (
        <section className="section card stack">
          <h2>Not on a cover yet</h2>
          {looseTracks.map((track) => (
            <div className="master-line" id={`trk-${track.id}`} key={track.id}>
              <div>
                <strong>{track.title}</strong>
                <p className="meta">
                  {track.artist_name} · {track.isrc ? `ISRC ${formatIsrc(track.isrc)}` : "ISRC needed"} · {track.writer_ipis ? `IPI ${track.writer_ipis}` : "IPI needed"}
                </p>
                <RegistrationMarks track={track} />
                <TakedownControls trackId={track.id} rows={takedowns.filter((row) => row.track_id === track.id)} />
              </div>
            </div>
          ))}
          {looseRoyalties.map((line) => (
            <div className="master-line" key={line.id}>
              <div>
                <strong>
                  {line.artist_name} · {line.period}
                </strong>
                <p className="meta">
                  {labelFor(ROYALTY_SOURCES, line.source)} · Gross {money(line.gross_cents)} · Applied {money(line.recoup_cents)}
                </p>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="section card stack">
        <h2>Add a master</h2>
        <TrackForm artists={artists} releases={releaseOptions} next="/catalog" />
      </section>
      <section className="section card stack">
        <h2>Log a statement</h2>
        <RoyaltyForm artists={artists} releases={releaseOptions} next="/catalog" />
      </section>
    </>
  );
}
