import {
  attachTeam,
  createContract,
  createNote,
  createPerson,
  createProject,
  createRelease,
  createInfluencer,
  createRoyalty,
  createTrack,
  updateContract,
  updateNote,
  updatePerson,
  updateProject,
  updateRelease,
  updateRoyalty,
  updateInfluencer,
  updateTrack,
} from "@/lib/actions";
import { dollarsInput, durationInput, formatIsrc } from "@/lib/format";
import { CONTACT_KINDS, DEAL_STATUSES, DEAL_TYPES, INFLUENCER_STATUSES, PLATFORMS, PROJECT_KINDS, PROJECT_STATUSES, RELEASE_STATUSES, RELEASE_TYPES, ROLES, ROYALTY_SOURCES, labelFor } from "@/lib/labels";
import type { Choice } from "@/lib/labels";
import type { Contract, Influencer, Note, Person, Project, Release, Track } from "@/lib/types";
import { SubmitButton } from "./controls";
import { Field } from "./ui";

type ArtistOption = { id: string; name: string };
type ReleaseOption = { id: string; title: string; artist_name?: string };

function Choices({ name, list, value }: { name: string; list: Choice[]; value?: string | null }) {
  return (
    <select name={name} defaultValue={value || list[0]?.value}>
      {list.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

function ArtistPick({ artists, value, allowEmpty }: { artists: ArtistOption[]; value?: string | null; allowEmpty?: boolean }) {
  return (
    <select name="artist_id" defaultValue={value ?? ""} required={!allowEmpty}>
      <option value="">{allowEmpty ? "Label — no artist" : "Select an artist"}</option>
      {artists.map((artist) => (
        <option key={artist.id} value={artist.id}>
          {artist.name}
        </option>
      ))}
    </select>
  );
}

export function DealForm({
  artists,
  artistId,
  deal,
  next,
}: {
  artists?: ArtistOption[];
  artistId?: string;
  deal?: Contract | null;
  next: string;
}) {
  return (
    <form action={deal ? updateContract : createContract} className="form-grid">
      {deal ? <input type="hidden" name="id" value={deal.id} /> : null}
      <input type="hidden" name="next" value={next} />
      {artistId ? (
        <input type="hidden" name="artist_id" value={deal?.artist_id ?? artistId} />
      ) : (
        <Field label="Artist" wide>
          <ArtistPick artists={artists ?? []} value={deal?.artist_id} />
        </Field>
      )}
      <Field label="Title" wide>
        <input name="title" required defaultValue={deal?.title ?? ""} placeholder="Artist — Recording agreement" />
      </Field>
      <Field label="Deal type">
        <Choices name="deal_type" list={DEAL_TYPES} value={deal?.deal_type} />
      </Field>
      <Field label="Status">
        <Choices name="status" list={DEAL_STATUSES} value={deal?.status ?? "draft"} />
      </Field>
      <Field label="Territory">
        <input name="territory" defaultValue={deal?.territory ?? "Worldwide"} />
      </Field>
      <Field label="Artist royalty %" hint="Say what the base is in the notes. PPD, net receipts, or dealer price.">
        <input name="royalty_rate" inputMode="decimal" step="0.1" min="0" max="100" defaultValue={deal?.royalty_rate ?? ""} />
      </Field>
      <Field label="Term, years">
        <input name="term_years" inputMode="decimal" step="0.5" min="0" defaultValue={deal?.term_years ?? ""} />
      </Field>
      <Field label="Options">
        <input name="options" inputMode="numeric" min="0" defaultValue={deal?.options ?? ""} />
      </Field>
      <Field label="Advance, USD">
        <input name="advance" inputMode="decimal" min="0" step="0.01" defaultValue={dollarsInput(deal?.advance_cents)} />
      </Field>
      <Field label="Effective">
        <input name="effective_date" type="date" defaultValue={deal?.effective_date ?? ""} />
      </Field>
      <Field label="Ends">
        <input name="end_date" type="date" defaultValue={deal?.end_date ?? ""} />
      </Field>
      <label className="check wide">
        <input type="checkbox" name="recoupable" value="1" defaultChecked={deal ? deal.recoupable === 1 : true} />
        <span>Advance is recoupable</span>
      </label>
      <Field label="Notes" wide>
        <textarea name="notes" defaultValue={deal?.notes ?? ""} placeholder="Cross-collateral, delivery commitment, territory carve-outs." />
      </Field>
      <div className="actions wide">
        <SubmitButton label={deal ? "Save deal" : "Add deal"} />
      </div>
    </form>
  );
}

export function ReleaseForm({
  artists,
  artistId,
  release,
  next,
  stay,
}: {
  artists?: ArtistOption[];
  artistId?: string;
  release?: Release | null;
  next: string;
  stay?: boolean;
}) {
  return (
    <form action={release ? updateRelease : createRelease} className="form-grid">
      {release ? <input type="hidden" name="id" value={release.id} /> : null}
      <input type="hidden" name="next" value={next} />
      {stay ? <input type="hidden" name="stay" value="1" /> : null}
      {artistId || release ? (
        <input type="hidden" name="artist_id" value={release?.artist_id ?? artistId} />
      ) : (
        <Field label="Artist" wide>
          <ArtistPick artists={artists ?? []} />
        </Field>
      )}
      <Field label="Title" wide>
        <input name="title" required defaultValue={release?.title ?? ""} />
      </Field>
      <Field label="Type">
        <Choices name="release_type" list={RELEASE_TYPES} value={release?.release_type} />
      </Field>
      <Field label="Status">
        <Choices name="status" list={RELEASE_STATUSES} value={release?.status ?? "idea"} />
      </Field>
      <Field label="Street date">
        <input name="release_date" type="date" defaultValue={release?.release_date ?? ""} />
      </Field>
      <Field label="Catalog no.">
        <input name="catalog_no" defaultValue={release?.catalog_no ?? ""} placeholder="FOF-0042" />
      </Field>
      <Field label="UPC">
        <input name="upc" inputMode="numeric" pattern="[0-9]*" defaultValue={release?.upc ?? ""} />
      </Field>
      <Field label="Imprint">
        <input name="imprint" defaultValue={release?.imprint ?? "FOF Records"} />
      </Field>
      <Field label="Distributor">
        <input name="distributor" defaultValue={release?.distributor ?? ""} />
      </Field>
      <Field label="Budget, USD">
        <input name="budget" inputMode="decimal" min="0" step="0.01" defaultValue={dollarsInput(release?.budget_cents)} />
      </Field>
      <Field label="Cover URL" wide>
        <input name="cover_url" defaultValue={release?.cover_url ?? ""} placeholder="https://" />
      </Field>
      <Field label="Notes" wide>
        <textarea name="notes" defaultValue={release?.notes ?? ""} />
      </Field>
      <div className="actions wide">
        <SubmitButton label={release ? "Save release" : "Add release"} />
      </div>
    </form>
  );
}

export function TrackForm({
  artists,
  artistId,
  releases,
  releaseId,
  track,
  next,
}: {
  artists?: ArtistOption[];
  artistId?: string;
  releases: ReleaseOption[];
  releaseId?: string | null;
  track?: Track | null;
  next: string;
}) {
  const lockedRelease = releaseId ?? track?.release_id;
  return (
    <form action={track ? updateTrack : createTrack} className="form-grid">
      {track ? <input type="hidden" name="id" value={track.id} /> : null}
      <input type="hidden" name="next" value={next} />
      {artistId || track ? <input type="hidden" name="artist_id" value={track?.artist_id ?? artistId} /> : null}
      {!artistId && !track ? (
        <Field label="Artist" wide>
          <ArtistPick artists={artists ?? []} />
        </Field>
      ) : null}
      {releaseId ? (
        <input type="hidden" name="release_id" value={releaseId} />
      ) : (
        <Field label="Release" wide>
          <select name="release_id" defaultValue={lockedRelease ?? ""}>
            <option value="">No release yet</option>
            {releases.map((release) => (
              <option key={release.id} value={release.id}>
                {release.artist_name ? `${release.artist_name} — ${release.title}` : release.title}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Title" wide>
        <input name="title" required defaultValue={track?.title ?? ""} />
      </Field>
      <Field label="Track no.">
        <input name="track_number" inputMode="numeric" min="1" defaultValue={track?.track_number ?? ""} />
      </Field>
      <Field label="Duration" hint="Minutes:seconds, like 3:30.">
        <input name="duration" defaultValue={durationInput(track?.duration_sec)} placeholder="3:30" />
      </Field>
      <Field label="ISRC" hint="12 characters for this recording. Example: US-FOF-26-00001.">
        <input name="isrc" defaultValue={track?.isrc ? formatIsrc(track.isrc) : ""} placeholder="US-FOF-26-00001" className="mono-text" />
      </Field>
      <Field label="Master owner">
        <input name="master_owner" defaultValue={track?.master_owner ?? "FOF Records"} />
      </Field>
      <Field label="Writers" wide>
        <input name="writers" defaultValue={track?.writers ?? ""} placeholder="Name 50%, Name 50%" />
      </Field>
      <Field label="Writer IPIs" wide hint="One writer per line: name, then the IPI. An IPI is 9 to 11 digits.">
        <textarea name="writer_ipis" defaultValue={track?.writer_ipis ?? ""} placeholder={"BIGDEUCEFOF 00123456789\nJane Writer 00987654321"} />
      </Field>
      <Field label="Producers" wide>
        <input name="producers" defaultValue={track?.producers ?? ""} />
      </Field>
      <Field label="Publishing" wide>
        <input name="publishing" defaultValue={track?.publishing ?? "FOF Music Publishing"} />
      </Field>
      <label className="check wide">
        <input type="checkbox" name="explicit" value="1" defaultChecked={track?.explicit === 1} />
        <span>Explicit</span>
      </label>
      <Field label="Notes" wide>
        <textarea name="notes" defaultValue={track?.notes ?? ""} />
      </Field>
      <div className="actions wide">
        <SubmitButton label={track ? "Save master" : "Add master"} />
      </div>
    </form>
  );
}

export function ProjectForm({
  artists,
  artistId,
  releases,
  project,
  next,
}: {
  artists?: ArtistOption[];
  artistId?: string;
  releases: ReleaseOption[];
  project?: Project | null;
  next: string;
}) {
  return (
    <form action={project ? updateProject : createProject} className="form-grid">
      {project ? <input type="hidden" name="id" value={project.id} /> : null}
      <input type="hidden" name="next" value={next} />
      {artistId ? (
        <input type="hidden" name="artist_id" value={project?.artist_id ?? artistId} />
      ) : (
        <Field label="Artist">
          <ArtistPick artists={artists ?? []} value={project?.artist_id} allowEmpty />
        </Field>
      )}
      <Field label="Release">
        <select name="release_id" defaultValue={project?.release_id ?? ""}>
          <option value="">No release</option>
          {releases.map((release) => (
            <option key={release.id} value={release.id}>
              {release.artist_name ? `${release.artist_name} — ${release.title}` : release.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Name" wide>
        <input name="name" required defaultValue={project?.name ?? ""} placeholder="Album campaign, video, tour support" />
      </Field>
      <Field label="Kind">
        <Choices name="kind" list={PROJECT_KINDS} value={project?.kind} />
      </Field>
      <Field label="Status">
        <Choices name="status" list={PROJECT_STATUSES} value={project?.status ?? "planned"} />
      </Field>
      <Field label="Budget, USD">
        <input name="budget" inputMode="decimal" min="0" step="0.01" defaultValue={dollarsInput(project?.budget_cents)} />
      </Field>
      <Field label="Spent, USD">
        <input name="spent" inputMode="decimal" min="0" step="0.01" defaultValue={dollarsInput(project?.spent_cents)} />
      </Field>
      <Field label="Start">
        <input name="start_date" type="date" defaultValue={project?.start_date ?? ""} />
      </Field>
      <Field label="Due">
        <input name="due_date" type="date" defaultValue={project?.due_date ?? ""} />
      </Field>
      <Field label="Owner" wide>
        <input name="owner" defaultValue={project?.owner ?? ""} />
      </Field>
      <Field label="Notes" wide>
        <textarea name="notes" defaultValue={project?.notes ?? ""} />
      </Field>
      <div className="actions wide">
        <SubmitButton label={project ? "Save budget" : "Open budget"} />
      </div>
    </form>
  );
}

export function RoyaltyForm({
  artists,
  artistId,
  releases,
  releaseId,
  royalty,
  next,
}: {
  artists?: ArtistOption[];
  artistId?: string;
  releases: ReleaseOption[];
  releaseId?: string | null;
  royalty?: { id: string; artist_id: string; release_id: string | null; period: string; source: string; gross_cents: number; recoup_cents: number; notes: string | null } | null;
  next: string;
}) {
  return (
    <form action={royalty ? updateRoyalty : createRoyalty} className="form-grid">
      {royalty ? <input type="hidden" name="id" value={royalty.id} /> : null}
      <input type="hidden" name="next" value={next} />
      {artistId ? (
        <input type="hidden" name="artist_id" value={royalty?.artist_id ?? artistId} />
      ) : (
        <Field label="Artist" wide>
          <ArtistPick artists={artists ?? []} value={royalty?.artist_id} />
        </Field>
      )}
      <Field label="Period">
        <input name="period" required defaultValue={royalty?.period ?? ""} placeholder="2026 H2" />
      </Field>
      <Field label="Source">
        <Choices name="source" list={ROYALTY_SOURCES} value={royalty?.source ?? "spotify"} />
      </Field>
      {releaseId ? (
        <input type="hidden" name="release_id" value={releaseId} />
      ) : (
        <Field label="Release">
          <select name="release_id" defaultValue={royalty?.release_id ?? ""}>
            <option value="">All releases</option>
            {releases.map((release) => (
              <option key={release.id} value={release.id}>
                {release.artist_name ? `${release.artist_name} — ${release.title}` : release.title}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Gross, USD">
        <input name="gross" inputMode="decimal" min="0" step="0.01" defaultValue={dollarsInput(royalty?.gross_cents)} />
      </Field>
      <Field label="Applied to advance, USD" hint="Usually the artist's share. This is what eats the advance.">
        <input name="recoup" inputMode="decimal" min="0" step="0.01" defaultValue={dollarsInput(royalty?.recoup_cents)} />
      </Field>
      <Field label="Notes" wide>
        <textarea name="notes" defaultValue={royalty?.notes ?? ""} />
      </Field>
      <div className="actions wide">
        <SubmitButton label={royalty ? "Save statement" : "Log statement"} />
      </div>
    </form>
  );
}

export function PersonForm({ person, artistId, next }: { person?: Person | null; artistId?: string; next: string }) {
  return (
    <form action={person ? updatePerson : createPerson} className="form-grid">
      {person ? <input type="hidden" name="id" value={person.id} /> : null}
      <input type="hidden" name="next" value={next} />
      {artistId ? <input type="hidden" name="artist_id" value={artistId} /> : null}
      <Field label="Name">
        <input name="name" required defaultValue={person?.name ?? ""} />
      </Field>
      <Field label="Role">
        <Choices name="role" list={ROLES} value={person?.role ?? "manager"} />
      </Field>
      <Field label="Company">
        <input name="company" defaultValue={person?.company ?? ""} />
      </Field>
      <Field label="Relationship" hint="How they sit on this file. Manager, outside counsel, A&R.">
        <input name="relationship" placeholder="Manager" />
      </Field>
      <Field label="Email">
        <input name="email" type="email" defaultValue={person?.email ?? ""} />
      </Field>
      <Field label="Phone">
        <input name="phone" inputMode="tel" autoComplete="tel" defaultValue={person?.phone ?? ""} />
      </Field>
      <Field label="IPI" hint="9 to 11 digits, if this person writes or publishes.">
        <input name="ipi" inputMode="numeric" defaultValue={person?.ipi ?? ""} />
      </Field>
      <Field label="Notes" wide>
        <textarea name="notes" defaultValue={person?.notes ?? ""} />
      </Field>
      <div className="actions wide">
        <SubmitButton label={person ? "Save person" : "Add person"} />
      </div>
    </form>
  );
}

export function TeamForm({
  artistId,
  directory,
  next,
}: {
  artistId: string;
  directory: { id: string; name: string; role: string; company: string | null }[];
  next: string;
}) {
  return (
    <form action={attachTeam} className="form-grid">
      <input type="hidden" name="artist_id" value={artistId} />
      <input type="hidden" name="next" value={next} />
      <Field label="Someone already in the directory" wide>
        <select name="person_id" defaultValue="">
          <option value="">Add someone new instead</option>
          {directory.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name} · {labelFor(ROLES, person.role)}
              {person.company ? ` · ${person.company}` : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Relationship">
        <input name="relationship" placeholder="Manager, outside counsel, producer" />
      </Field>
      <Field label="Or a new name">
        <input name="name" placeholder="Full name" />
      </Field>
      <Field label="Role">
        <Choices name="role" list={ROLES} value="manager" />
      </Field>
      <Field label="Company">
        <input name="company" />
      </Field>
      <Field label="Email">
        <input name="email" type="email" />
      </Field>
      <Field label="Phone">
        <input name="phone" inputMode="tel" autoComplete="tel" />
      </Field>
      <div className="actions wide">
        <SubmitButton label="Add to the file" />
      </div>
    </form>
  );
}

export function NoteForm({ artistId, note, next }: { artistId: string; note?: Note | null; next: string }) {
  return (
    <form action={note ? updateNote : createNote} className="stack">
      {note ? <input type="hidden" name="id" value={note.id} /> : null}
      <input type="hidden" name="artist_id" value={note?.artist_id ?? artistId} />
      <input type="hidden" name="next" value={next} />
      <Field label={note ? "Note" : "Add a note"}>
        <textarea name="body" required defaultValue={note?.body ?? ""} placeholder="What was said, what was decided, what is owed." />
      </Field>
      <Field label="Author">
        <input name="author" defaultValue={note?.author ?? ""} placeholder="Your name" />
      </Field>
      <SubmitButton label={note ? "Save note" : "Post note"} />
    </form>
  );
}

export function InfluencerForm({ person, next }: { person?: Influencer | null; next: string }) {
  return (
    <form action={person ? updateInfluencer : createInfluencer} className="form-grid">
      {person ? <input type="hidden" name="id" value={person.id} /> : null}
      <input type="hidden" name="next" value={next} />
      <Field label="Name">
        <input name="name" required defaultValue={person?.name ?? ""} />
      </Field>
      <Field label="@">
        <input name="handle" defaultValue={person?.handle ?? ""} placeholder="@handle" />
      </Field>
      <Field label="Number">
        <input name="phone" inputMode="tel" autoComplete="tel" defaultValue={person?.phone ?? ""} placeholder="Phone number" />
      </Field>
      <Field label="Kind">
        <Choices name="kind" list={CONTACT_KINDS} value={person?.kind ?? "influencer"} />
      </Field>
      <Field label="Platform">
        <Choices name="platform" list={PLATFORMS} value={person?.platform ?? "instagram"} />
      </Field>
      <Field label="Status">
        <Choices name="status" list={INFLUENCER_STATUSES} value={person?.status ?? "prospect"} />
      </Field>
      <Field label="Profile URL" wide>
        <input name="profile_url" defaultValue={person?.profile_url ?? ""} placeholder="https://" />
      </Field>
      <Field label="Email">
        <input name="email" type="email" defaultValue={person?.email ?? ""} />
      </Field>
      <Field label="Followers">
        <input name="followers" inputMode="numeric" defaultValue={person?.followers ?? ""} />
      </Field>
      <Field label="City">
        <input name="city" defaultValue={person?.city ?? ""} />
      </Field>
      <Field label="Niche">
        <input name="niche" defaultValue={person?.niche ?? ""} placeholder="Hip-hop, beauty, nightlife" />
      </Field>
      <Field label="Rate">
        <input name="rate" defaultValue={person?.rate ?? ""} placeholder="$500 a post, or product only" />
      </Field>
      <Field label="Notes" wide>
        <textarea name="notes" defaultValue={person?.notes ?? ""} placeholder="Who introduced them, what they posted, what they cost last time." />
      </Field>
      <div className="actions wide">
        <SubmitButton label={person ? "Save influencer" : "Add influencer"} />
      </div>
    </form>
  );
}
