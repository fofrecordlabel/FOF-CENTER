import { logTakedown, restoreTakedown } from "@/lib/actions";
import { prettyDate, today } from "@/lib/format";
import { STORES, labelFor } from "@/lib/labels";
import type { Takedown, Track } from "@/lib/types";

export function RegistrationMarks({ track }: { track: Pick<Track, "bmi" | "mlc" | "soundexchange"> }) {
  const marks = [
    ["BMI", track.bmi],
    ["MLC", track.mlc],
    ["SoundExchange", track.soundexchange],
  ] as const;
  return (
    <p className="marks">
      {marks.map(([name, on]) => (
        <span className={on ? "pill good" : "pill"} key={name}>
          {on ? name : `${name} open`}
        </span>
      ))}
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
