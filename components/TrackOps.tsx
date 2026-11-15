import Link from "next/link";
import { logTakedown, restoreTakedown, setRegistration } from "@/lib/actions";
import { listReleaseChecks, listReleaseViews, listTrackViews } from "@/lib/db";
import { Mono } from "@/components/ui";
import { prettyDate, today } from "@/lib/format";
import { STORES, labelFor } from "@/lib/labels";
import type { Takedown, Track } from "@/lib/types";

const FIELDS = [
  ["bmi", "BMI"],
  ["mlc", "MLC"],
  ["soundexchange", "SX"],
  ["sentric", "Sentric"],
] as const;

type Flags = Pick<Track, "bmi" | "mlc" | "soundexchange" | "sentric">;

function registered(flags: Flags) {
  return FIELDS.every(([key]) => Number(flags[key]) === 1);
}

export async function OpenRegistrations({ next = "/" }: { next?: string }) {
  const tracks = (await listTrackViews()).slice().sort((a, b) => a.title.localeCompare(b.title));
  const open = tracks.filter((track) => !registered(track));
  const done = tracks.filter((track) => registered(track));
  return (
    <section className="card stack" id="registration">
      <div className="section-head">
        <h2>{open.length ? `${open.length} still open` : "Registered"}</h2>
        <Link href="/releases">Releases</Link>
      </div>
      {tracks.length ? (
        <>
          <div className="reg-board">
            {(open.length ? open : done).map((track) => (
              <RegistrationLine key={track.id} track={track} next={next} />
            ))}
          </div>
          {open.length && done.length ? (
            <details className="drawer">
              <summary>{done.length} registered</summary>
              <div className="reg-board">
                {done.map((track) => (
                  <RegistrationLine key={track.id} track={track} next={next} />
                ))}
              </div>
            </details>
          ) : null}
        </>
      ) : (
        <p className="meta">No songs on file yet.</p>
      )}
    </section>
  );
}

function RegistrationLine({ track, next }: { track: Flags & { id: string; title: string; artist_name?: string | null; release_title?: string | null }; next: string }) {
  return (
    <div className="reg-line">
      <div>
        <strong>{track.title}</strong>
        <p className="meta">{[track.artist_name, track.release_title].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="reg-toggles">
        {FIELDS.map(([key, name]) => {
          const on = Number(track[key]) === 1;
          return (
            <form action={setRegistration} className="mark-form" key={key}>
              <input type="hidden" name="id" value={track.id} />
              <input type="hidden" name="field" value={key} />
              <input type="hidden" name="next" value={next} />
              <button className={on ? "pill good" : "pill"} type="submit" aria-pressed={on}>
                {name}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}

export async function ReleaseJobs() {
  const [releases, checks] = await Promise.all([listReleaseViews(), listReleaseChecks()]);
  const byRelease = new Map(checks.map((row) => [row.release_id, row]));
  const open = releases.filter((release) => {
    const flags = byRelease.get(release.id);
    return !flags || !registered(flags);
  });
  if (!open.length) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2>Open releases</h2>
        <Link href="/releases">Releases</Link>
      </div>
      <div className="job-list">
        {open.map((release) => {
          const flags = byRelease.get(release.id) ?? { bmi: 0, mlc: 0, soundexchange: 0, sentric: 0 };
          return (
            <Link className="job-card" href={`/releases/${release.id}`} key={release.id}>
              <span className="cover-ring">
                <Mono name={release.title} image={release.cover_url} />
              </span>
              <div>
                <strong>{release.title}</strong>
                <p className="meta">{[release.artist_name, release.distributor || "No distributor"].join(" · ")}</p>
                <RegistrationMarks track={flags} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function RegistrationMarks({ track }: { track: Flags }) {
  return (
    <p className="marks">
      {FIELDS.map(([key, name]) => {
        const on = Number(track[key]) === 1;
        return (
          <span className={on ? "pill good" : "pill"} key={key}>
            {on ? name : `${name} open`}
          </span>
        );
      })}
    </p>
  );
}

export function TakedownControls({ trackId, rows }: { trackId: string; rows: Takedown[] }) {
  const open = rows.filter((row) => !row.restored_at);
  const history = rows.filter((row) => row.restored_at);
  return (
    <div className="takedown">
      {open.map((row) => (
        <form action={restoreTakedown} className="down-line" key={row.id}>
          <input type="hidden" name="id" value={row.id} />
          <input type="hidden" name="next" value="/catalog" />
          <span>
            Down on {labelFor(STORES, row.store)} since {prettyDate(row.taken_down_at)}
            {row.note ? ` · ${row.note}` : ""}
          </span>
          <button className="btn small primary" type="submit">
            Put back up
          </button>
        </form>
      ))}
      <details className="drawer">
        <summary>Log a takedown</summary>
        <form action={logTakedown} className="form-grid">
          <input type="hidden" name="track_id" value={trackId} />
          <input type="hidden" name="next" value="/catalog" />
          <label className="field">
            <span>Store</span>
            <select name="store" defaultValue="spotify">
              {STORES.map((store) => (
                <option key={store.value} value={store.value}>
                  {store.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Taken down</span>
            <input name="taken_down_at" type="date" defaultValue={today()} />
          </label>
          <label className="field wide">
            <span>Note</span>
            <input name="note" placeholder="Why it came down, and what to send back" />
          </label>
          <div className="actions wide">
            <button className="btn" type="submit">
              Save takedown
            </button>
          </div>
        </form>
      </details>
      {history.length ? (
        <details className="drawer">
          <summary>Takedown history</summary>
          {history.map((row) => (
            <p className="meta" key={row.id}>
              {labelFor(STORES, row.store)} · down {prettyDate(row.taken_down_at)} · back up {prettyDate(row.restored_at)}
              {row.note ? ` · ${row.note}` : ""}
            </p>
          ))}
        </details>
      ) : null}
    </div>
  );
}
