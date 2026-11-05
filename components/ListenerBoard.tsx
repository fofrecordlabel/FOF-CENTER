import { createListenerLog, deleteListenerLog } from "@/lib/actions";
import { ConfirmSubmit, SubmitButton } from "@/components/controls";
import { ListenerChart, type ChartMark } from "@/components/ListenerChart";
import { Field } from "@/components/ui";
import { BIGDEUCE_LOGO, isBigDeuce } from "@/lib/brand";
import { count, prettyDate, today } from "@/lib/format";
import type { ListenerLog } from "@/lib/types";

export type { ChartMark };

const GOAL = 100_000;

export function ListenerBoard({
  artist,
  logs,
  marks = [],
  next,
}: {
  artist: { id: string; name: string; monthly_listeners: number | null };
  logs: ListenerLog[];
  marks?: ChartMark[];
  next: string;
}) {
  const latest = logs[logs.length - 1];
  const previous = logs[logs.length - 2];
  const current = latest?.listeners ?? artist.monthly_listeners;
  const delta = latest && previous ? latest.listeners - previous.listeners : null;
  const move = deltaLabel(delta);
  const left = current == null ? GOAL : GOAL - current;
  const pct = current == null ? 0 : Math.max(0, Math.min(100, (current / GOAL) * 100));

  return (
    <section className="card listener">
      <div className="section-head">
        <div className="listener-brand">
          {isBigDeuce(artist.name) ? <img className="artist-logo" src={BIGDEUCE_LOGO} alt="" /> : null}
          <div>
            <p className="kicker">Monthly listeners</p>
            <h2>{artist.name}</h2>
          </div>
        </div>
        {move ? <p className={`delta ${move.kind}`}>{move.text}</p> : <p className="delta">No change yet</p>}
      </div>

      <div className="listener-now">
        <b>{current == null ? "—" : count(current)}</b>
        <span>{latest ? `Logged ${prettyDate(latest.log_date)}` : "No log yet"}</span>
      </div>

      <div className="goal">
        <div className="goal-top">
          <span>{left > 0 ? `${count(left)} to 100K` : left === 0 ? "100K" : `${count(Math.abs(left))} past 100K`}</span>
          <span>{pct.toFixed(pct < 10 && pct > 0 ? 1 : 0)}%</span>
        </div>
        <div className="goal-bar" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ListenerChart
        logs={logs.map((log) => ({
          id: log.id,
          artist_id: log.artist_id,
          log_date: log.log_date,
          listeners: log.listeners,
          note: log.note,
          created_at: log.created_at,
        }))}
        marks={marks.map((mark) => ({ id: mark.id, log_date: mark.log_date, kind: mark.kind, title: mark.title }))}
      />

      <form action={createListenerLog} className="form-grid">
        <input type="hidden" name="artist_id" value={artist.id} />
        <input type="hidden" name="next" value={next} />
        <Field label="Date">
          <input name="log_date" type="date" required defaultValue={today()} />
        </Field>
        <Field label="Monthly listeners">
          <input name="listeners" inputMode="numeric" pattern="[0-9]*" enterKeyHint="done" required placeholder="12000" />
        </Field>
        <Field label="Note" wide>
          <input name="note" placeholder="Spotify, after the post" />
        </Field>
        <div className="actions wide">
          <SubmitButton label="Log listeners" />
        </div>
      </form>

      {logs.length ? (
        <div>
          {[...logs].reverse().map((log, index, list) => {
            const older = list[index + 1];
            const step = older ? log.listeners - older.listeners : null;
            const stepMove = deltaLabel(step);
            return (
              <div className="master-line" key={log.id}>
                <div>
                  <strong>{count(log.listeners)}</strong>
                  <p className="meta">
                    {prettyDate(log.log_date)}
                    {stepMove ? ` · ${stepMove.text}` : " · First log"}
                    {log.note ? ` · ${log.note}` : ""}
                  </p>
                </div>
                <form action={deleteListenerLog}>
                  <input type="hidden" name="id" value={log.id} />
                  <input type="hidden" name="next" value={next} />
                  <ConfirmSubmit className="btn danger small" label="Remove" message={`Remove the ${prettyDate(log.log_date)} listener log?`} />
                </form>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="meta">Log a number. The next one draws the gain or the drop.</p>
      )}
    </section>
  );
}

function deltaLabel(delta: number | null) {
  if (delta == null) return null;
  if (delta > 0) return { kind: "gain", text: `Gain ${count(delta)}` };
  if (delta < 0) return { kind: "drop", text: `Drop ${count(Math.abs(delta))}` };
  return { kind: "flat", text: "Flat" };
}

