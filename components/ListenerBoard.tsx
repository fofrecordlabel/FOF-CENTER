import { createListenerLog, deleteListenerLog } from "@/lib/actions";
import { ConfirmSubmit, SubmitButton } from "@/components/controls";
import { Field } from "@/components/ui";
import { count, prettyDate, today } from "@/lib/format";
import { LOG_KINDS, labelFor } from "@/lib/labels";
import type { ListenerLog } from "@/lib/types";

export type ChartMark = { id: string; log_date: string; kind: string; title: string };

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
        <div>
          <p className="kicker">Monthly listeners</p>
          <h2>{artist.name}</h2>
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

      <form action={createListenerLog} className="form-grid">
        <input type="hidden" name="artist_id" value={artist.id} />
        <input type="hidden" name="next" value={next} />
        <Field label="Date">
          <input name="log_date" type="date" required defaultValue={today()} />
        </Field>
        <Field label="Monthly listeners">
          <input name="listeners" inputMode="numeric" required placeholder="12000" />
        </Field>
        <Field label="Note" wide>
          <input name="note" placeholder="Spotify, after the post" />
        </Field>
        <div className="actions wide">
          <SubmitButton label="Log listeners" />
        </div>
      </form>

      <ListenerChart logs={logs} marks={marks} />
      {marks.length ? (
        <div className="mark-list">
          {marks.map((mark) => (
            <p className="meta" key={mark.id}>
              {labelFor(LOG_KINDS, mark.kind)} · {prettyDate(mark.log_date)} · {mark.title}
            </p>
          ))}
        </div>
      ) : null}

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

function ListenerChart({ logs, marks }: { logs: ListenerLog[]; marks: ChartMark[] }) {
  if (logs.length === 0 && marks.length === 0) return null;
  const w = 640;
  const h = 220;
  const padL = 16;
  const padR = 16;
  const padT = 28;
  const padB = 28;
  const stamp = (date: string) => new Date(`${date}T12:00:00`).getTime();
  const times = [...logs.map((log) => stamp(log.log_date)), ...marks.map((mark) => stamp(mark.log_date))];
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const xOf = (date: string) => (maxT === minT ? w / 2 : padL + ((stamp(date) - minT) / (maxT - minT)) * (w - padL - padR));
  const values = logs.map((log) => log.listeners);
  const lo = values.length ? Math.min(...values) : 0;
  const hi = values.length ? Math.max(...values) : 1;
  const y = (n: number) => {
    if (!values.length || hi === lo) return (padT + (h - padB)) / 2;
    return padT + (1 - (n - lo) / (hi - lo)) * (h - padT - padB);
  };
  const d = logs.map((log, i) => `${i === 0 ? "M" : "L"}${xOf(log.log_date).toFixed(1)} ${y(log.listeners).toFixed(1)}`).join(" ");
  const first = logs[0] ?? marks[0];
  const last = logs[logs.length - 1] ?? marks[marks.length - 1];

  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Listener logs with posts, promo, and playlist adds">
      {logs.length > 1 ? <path d={d} fill="none" stroke="#ffffff" strokeWidth="1.5" /> : null}
      {logs.map((log) => (
        <circle key={log.id} cx={xOf(log.log_date)} cy={y(log.listeners)} r="3.5" fill="#ffffff" />
      ))}
      {marks.map((mark, index) => {
        const slot = marks.slice(0, index).filter((item) => item.log_date === mark.log_date).length;
        const x = xOf(mark.log_date) + slot * 12;
        return (
          <g key={mark.id}>
            <line x1={x} y1={12} x2={x} y2={24} stroke="#ffffff" strokeWidth="1" />
            <text x={x} y={10} fill="#ffffff" fontSize="10" textAnchor="middle">
              {markLetter(mark.kind)}
            </text>
          </g>
        );
      })}
      {first ? (
        <text x={xOf(first.log_date)} y={h - 8} fill="#737373" fontSize="11" textAnchor={logs.length + marks.length === 1 ? "middle" : "start"}>
          {prettyDate(first.log_date)}
        </text>
      ) : null}
      {last && last !== first ? (
        <text x={xOf(last.log_date)} y={h - 8} fill="#737373" fontSize="11" textAnchor="end">
          {prettyDate(last.log_date)}
        </text>
      ) : null}
    </svg>
  );
}

function markLetter(kind: string) {
  if (kind === "promo") return "R";
  if (kind === "blog") return "B";
  if (kind === "playlist") return "L";
  return "P";
}
