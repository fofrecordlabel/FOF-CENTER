import Link from "next/link";
import { deleteContract, deleteNote, deleteProject, deleteRelease, deleteRoyalty, deleteTrack, detachTeam, passArtist, signArtist } from "@/lib/actions";
import { ConfirmSubmit, StageSelect } from "@/components/controls";
import { DealForm, NoteForm, ProjectForm, ReleaseForm, RoyaltyForm, TeamForm, TrackForm } from "@/components/RecordForms";
import { ListenerBoard, type ChartMark } from "@/components/ListenerBoard";
import { DistributorPick, ReleaseStatus } from "@/components/ReleaseMarks";
import { CoverUpload, MasterAudio } from "@/components/SongMedia";
import { Balance, BudgetBar, Mono, Pill } from "@/components/ui";
import { ago, compact, duration, formatIsrc, money, prettyDate, rate, socialUrl, term } from "@/lib/format";
import { DEAL_STATUSES, DEAL_TYPES, PRIORITIES, PROJECT_KINDS, PROJECT_STATUSES, RELEASE_TYPES, ROLES, ROYALTY_SOURCES, STAGES, isRoster, labelFor, priorityTone, stageTone, statusTone } from "@/lib/labels";
import type { Dossier, ListenerLog } from "@/lib/types";

export function DossierView({ file, listeners = [], marks = [] }: { file: Dossier; listeners?: ListenerLog[]; marks?: ChartMark[] }) {
  const { artist } = file;
  const next = `/artists/${artist.id}`;
  const place = [artist.genre, artist.base_city].filter(Boolean).join(" · ");
  const releases = file.releaseOptions;

  return (
    <div className="stack">
      <header className="page-head">
        <div className="who">
          <Mono name={artist.name} image={artist.image_url} large />
          <div>
            <p className="kicker">{artist.legal_name || "Artist file"}</p>
            <h1>{artist.name}</h1>
            {place ? <p className="lede">{place}</p> : null}
          </div>
        </div>
        <div className="actions">
          <StageSelect id={artist.id} stage={artist.stage} />
          <Pill tone={priorityTone(artist.priority)}>{labelFor(PRIORITIES, artist.priority)}</Pill>
          {!isRoster(artist.stage) && artist.stage !== "passed" ? (
            <form action={signArtist}>
              <input type="hidden" name="id" value={artist.id} />
              <button className="btn primary">Mark signed</button>
            </form>
          ) : null}
          {artist.stage !== "passed" ? (
            <form action={passArtist}>
              <input type="hidden" name="id" value={artist.id} />
              <ConfirmSubmit className="btn" label="Mark passed" message={`Move ${artist.name} to passed?`} />
            </form>
          ) : null}
          <Link className="btn" href={`/artists/${artist.id}/edit`}>
            Edit file
          </Link>
        </div>
      </header>

      <div className="actions">
        <Pill tone={stageTone(artist.stage)}>{labelFor(STAGES, artist.stage)}</Pill>
        {artist.ar_rep ? <span className="meta">A&R {artist.ar_rep}</span> : null}
        {artist.signed_date ? <span className="meta">Signed {prettyDate(artist.signed_date)}</span> : null}
      </div>

      {artist.interest ? <p className="quote">{artist.interest}</p> : null}

      <ListenerBoard artist={artist} logs={listeners} marks={marks} next={next} />

      <section className="mini-stats">
        <div>
          <b>{compact(artist.monthly_listeners)}</b>
          <span>Monthly listeners</span>
        </div>
        <div>
          <b>{money(file.money.advance)}</b>
          <span>Executed advance</span>
        </div>
        <div>
          <b>
            <Balance cents={file.money.balance} />
          </b>
          <span>Recoupment</span>
        </div>
        <div>
          <b>{file.releases.length}</b>
          <span>{file.releases.length === 1 ? "Release" : "Releases"}</span>
        </div>
      </section>

      <section className="grid-2">
        <article className="card stack">
          <h2>Profile</h2>
          {artist.bio ? <p>{artist.bio}</p> : <p className="meta">No bio yet.</p>}
          <dl className="facts">
            <Fact label="From" value={artist.hometown} />
            <Fact label="Source" value={artist.source} />
            <Fact label="IPI" value={artist.ipi} />
            <Fact label="Email" value={artist.email} href={artist.email ? `mailto:${artist.email}` : null} />
            <Fact label="Phone" value={artist.phone} href={artist.phone ? `tel:${artist.phone}` : null} />
            <Social label="Instagram" value={artist.instagram} kind="instagram" />
            <Social label="TikTok" value={artist.tiktok} kind="tiktok" />
            <Social label="YouTube" value={artist.youtube} kind="youtube" />
            <Social label="Spotify" value={artist.spotify_url} kind="spotify" />
            <Social label="Web" value={artist.website} kind="website" />
          </dl>
        </article>
        <article className="card stack" id="team">
          <h2>Team</h2>
          {file.people.length ? (
            file.people.map((person) => (
              <div className="person" key={person.id}>
                <div>
                  <strong>{person.name}</strong>
                  <p className="meta">
                    {[person.relationship, labelFor(ROLES, person.role), person.company].filter(Boolean).join(" · ")}
                  </p>
                  {person.email ? <p className="meta">{person.email}</p> : null}
                  {person.phone ? <p className="meta">{person.phone}</p> : null}
                </div>
                <form action={detachTeam}>
                  <input type="hidden" name="artist_id" value={artist.id} />
                  <input type="hidden" name="person_id" value={person.id} />
                  <input type="hidden" name="next" value={next} />
                  <ConfirmSubmit className="btn small" label="Remove" message={`Remove ${person.name} from this file? They stay in the directory.`} />
                </form>
              </div>
            ))
          ) : (
            <p className="meta">No one on the file yet.</p>
          )}
          <details className="drawer">
            <summary>Add someone</summary>
            <TeamForm artistId={artist.id} directory={file.directory} next={next} />
          </details>
        </article>
      </section>

      <section className="section stack" id="deals">
        <div className="section-head">
          <h2>Deals</h2>
          <Link href="/deals">Business affairs</Link>
        </div>
        {file.contracts.map((deal) => (
          <article className="card stack" key={deal.id}>
            <div className="section-head">
              <div>
                <h3>{deal.title}</h3>
                <p className="meta">
                  {labelFor(DEAL_TYPES, deal.deal_type)} · {deal.territory || "Territory open"} · {term(deal.term_years, deal.options)} · {rate(deal.royalty_rate)} · {money(deal.advance_cents)} advance
                </p>
              </div>
              <Pill tone={statusTone(deal.status)}>{labelFor(DEAL_STATUSES, deal.status)}</Pill>
            </div>
            {deal.notes ? <p>{deal.notes}</p> : null}
            <p className="meta">
              {deal.effective_date ? `From ${prettyDate(deal.effective_date)}` : "No effective date"}
              {deal.end_date ? ` through ${prettyDate(deal.end_date)}` : ""}
              {deal.recoupable ? " · Recoupable" : " · Not recoupable"}
            </p>
            <details className="drawer">
              <summary>Edit deal</summary>
              <DealForm artistId={artist.id} deal={deal} next={next} />
            </details>
            <form action={deleteContract}>
              <input type="hidden" name="id" value={deal.id} />
              <input type="hidden" name="next" value={next} />
              <ConfirmSubmit className="btn danger small" label="Delete deal" message="Delete this deal?" />
            </form>
          </article>
        ))}
        <details className="drawer card">
          <summary>Add a deal</summary>
          <DealForm artistId={artist.id} next={next} />
        </details>
      </section>

      <section className="section stack" id="releases">
        <div className="section-head">
          <h2>Releases and masters</h2>
          <Link href="/catalog">Open the catalog</Link>
        </div>
        {file.releases.map((release) => (
          <article className={`card stack tone-${statusTone(release.status) || "plain"}`} key={release.id}>
            <div className="section-head">
              <div className="who">
                <Mono name={release.title} image={release.cover_url} />
                <div>
                  <h3>{release.title}</h3>
                  <p className="meta">
                    {labelFor(RELEASE_TYPES, release.release_type)} · {release.catalog_no || "No catalog no."} · {release.imprint || "FOF Records"}
                    {release.release_date ? ` · ${prettyDate(release.release_date)}` : ""}
                  </p>
                </div>
              </div>
              <div className="release-tools">
                <DistributorPick id={release.id} distributor={release.distributor} next={next} />
                <ReleaseStatus id={release.id} status={release.status} next={next} />
              </div>
            </div>
            <CoverUpload releaseId={release.id} />
            {release.tracks.map((track) => (
              <div className="track" key={track.id}>
                <strong>
                  {track.track_number ? `${track.track_number}. ` : ""}
                  {track.title}
                </strong>
                <span className="meta">{duration(track.duration_sec)}</span>
                <p className="sub">
                  {[track.isrc ? `ISRC ${formatIsrc(track.isrc)}` : "ISRC needed", track.writer_ipis ? `IPI ${track.writer_ipis}` : "IPI needed", track.writers ? `W ${track.writers}` : "", track.producers ? `P ${track.producers}` : "", track.master_owner, track.publishing]
                    .filter(Boolean)
                    .join(" · ")}
                  {track.explicit ? " · Explicit" : ""}
                </p>
                <MasterAudio trackId={track.id} src={track.audio_url} />
                <details className="drawer wide">
                  <summary>Edit master</summary>
                  <TrackForm artistId={artist.id} releases={releases} releaseId={release.id} track={track} next={next} />
                </details>
                <form action={deleteTrack}>
                  <input type="hidden" name="id" value={track.id} />
                  <input type="hidden" name="next" value={next} />
                  <ConfirmSubmit className="btn small danger" label="Delete" message={`Delete ${track.title}?`} />
                </form>
              </div>
            ))}
            <details className="drawer">
              <summary>Add a master</summary>
              <TrackForm artistId={artist.id} releases={releases} releaseId={release.id} next={next} />
            </details>
            <details className="drawer">
              <summary>Edit release</summary>
              <ReleaseForm artistId={artist.id} release={release} next={next} stay />
            </details>
            <div className="actions">
              <Link className="btn small" href={`/releases/${release.id}`}>
                Open release
              </Link>
              <form action={deleteRelease}>
                <input type="hidden" name="id" value={release.id} />
                <input type="hidden" name="next" value={next} />
                <ConfirmSubmit className="btn danger small" label="Delete release" message={`Delete ${release.title} and its masters?`} />
              </form>
            </div>
          </article>
        ))}
        <details className="drawer card">
          <summary>Add a release</summary>
          <ReleaseForm artistId={artist.id} next={next} stay />
        </details>
      </section>

      <section className="section stack" id="budgets">
        <div className="section-head">
          <h2>Budgets</h2>
          <Link href="/projects">All budgets</Link>
        </div>
        {file.projects.map((project) => (
          <article className="card stack" key={project.id}>
            <div className="section-head">
              <div>
                <h3>{project.name}</h3>
                <p className="meta">
                  {labelFor(PROJECT_KINDS, project.kind)} · {money(project.spent_cents)} of {money(project.budget_cents)}
                  {project.due_date ? ` · due ${prettyDate(project.due_date)}` : ""}
                  {project.owner ? ` · ${project.owner}` : ""}
                </p>
              </div>
              <Pill tone={statusTone(project.status)}>{labelFor(PROJECT_STATUSES, project.status)}</Pill>
            </div>
            <BudgetBar budget={project.budget_cents} spent={project.spent_cents} />
            {project.notes ? <p>{project.notes}</p> : null}
            <details className="drawer">
              <summary>Edit budget</summary>
              <ProjectForm artistId={artist.id} releases={releases} project={project} next={next} />
            </details>
            <form action={deleteProject}>
              <input type="hidden" name="id" value={project.id} />
              <input type="hidden" name="next" value={next} />
              <ConfirmSubmit className="btn danger small" label="Delete budget" message="Delete this budget?" />
            </form>
          </article>
        ))}
        <details className="drawer card">
          <summary>Open a budget</summary>
          <ProjectForm artistId={artist.id} releases={releases} next={next} />
        </details>
      </section>

      <section className="section stack" id="money">
        <div className="section-head">
          <h2>Statements</h2>
          <Link href="/catalog">Open the catalog</Link>
        </div>
        <p className="meta">
          Gross {money(file.money.gross)} · Applied {money(file.money.recouped)} · <Balance cents={file.money.balance} />
        </p>
        {file.royalties.map((line) => (
          <article className="card stack" key={line.id}>
            <div className="section-head">
              <h3>
                {line.period} · {labelFor(ROYALTY_SOURCES, line.source)}
              </h3>
              <span>{money(line.recoup_cents)} applied</span>
            </div>
            <p className="meta">Gross {money(line.gross_cents)}</p>
            {line.notes ? <p>{line.notes}</p> : null}
            <details className="drawer">
              <summary>Edit statement</summary>
              <RoyaltyForm artistId={artist.id} releases={releases} royalty={line} next={next} />
            </details>
            <form action={deleteRoyalty}>
              <input type="hidden" name="id" value={line.id} />
              <input type="hidden" name="next" value={next} />
              <ConfirmSubmit className="btn danger small" label="Delete statement" message="Delete this statement?" />
            </form>
          </article>
        ))}
        <details className="drawer card">
          <summary>Log a statement</summary>
          <RoyaltyForm artistId={artist.id} releases={releases} next={next} />
        </details>
      </section>

      <section className="section grid-2">
        <article className="card stack" id="notes">
          <h2>Notes</h2>
          <NoteForm artistId={artist.id} next={next} />
          {file.notes.map((note) => (
            <div className="note" key={note.id}>
              <p>{note.body}</p>
              <p className="meta">
                {note.author || "Desk"} · {ago(note.created_at)}
              </p>
              <details className="drawer">
                <summary>Edit</summary>
                <NoteForm artistId={artist.id} note={note} next={next} />
              </details>
              <form action={deleteNote}>
                <input type="hidden" name="id" value={note.id} />
                <input type="hidden" name="next" value={next} />
                <button className="btn small danger">Delete note</button>
              </form>
            </div>
          ))}
        </article>
        <article className="card stack">
          <h2>Activity</h2>
          <ul className="timeline">
            {file.activity.map((item) => (
              <li key={item.id}>
                <time dateTime={item.created_at}>{ago(item.created_at)}</time>
                <div>
                  <strong>{item.action}</strong>
                  <p className="meta">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          {file.activity.length === 0 ? <p className="meta">Nothing logged yet.</p> : null}
        </article>
      </section>
    </div>
  );
}

function Fact({ label, value, href }: { label: string; value: string | null; href?: string | null }) {
  if (!value) return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>{href ? <a href={href}>{value}</a> : value}</dd>
    </>
  );
}

function Social({ label, value, kind }: { label: string; value: string | null; kind: "instagram" | "tiktok" | "youtube" | "website" | "spotify" }) {
  if (!value) return null;
  const href = socialUrl(kind, value);
  return (
    <>
      <dt>{label}</dt>
      <dd>{href ? <a href={href} target="_blank" rel="noreferrer">{value}</a> : value}</dd>
    </>
  );
}
