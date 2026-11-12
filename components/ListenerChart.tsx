"use client";

import { useState } from "react";
import { compact, count, prettyDate } from "@/lib/format";
import { LOG_KINDS, labelFor } from "@/lib/labels";
import type { ListenerLog } from "@/lib/types";

export type ChartMark = { id: string; log_date: string; kind: string; title: string };

const W = 720;
const H = 300;
const PAD_L = 56;
const PAD_R = 20;
const PAD_T = 36;
const PAD_B = 36;

type Move = { from: ListenerLog; to: ListenerLog; delta: number; kind: "spike" | "drop" | "flat" };

export function ListenerChart({ logs, marks }: { logs: ListenerLog[]; marks: ChartMark[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = logs.find((log) => log.id === activeId) ?? logs[logs.length - 1] ?? null;
  const activeIndex = active ? logs.findIndex((log) => log.id === active.id) : -1;
  const previous = activeIndex > 0 ? logs[activeIndex - 1] : null;
  const delta = active && previous ? active.listeners - previous.listeners : null;
  const move = deltaLabel(delta);
  const scale = axis(logs);
  const times = [...logs.map((log) => stamp(log.log_date)), ...marks.map((mark) => stamp(mark.log_date))];
  const minT = times.length ? Math.min(...times) : stamp("2000-01-01");
  const maxT = times.length ? Math.max(...times) : minT;
  const xOf = (date: string) => {
    if (maxT === minT) return (PAD_L + (W - PAD_R)) / 2;
    return PAD_L + ((stamp(date) - minT) / (maxT - minT)) * (W - PAD_L - PAD_R);
  };
  const yOf = (n: number) => {
    const span = scale.ceiling - scale.floor || 1;
    return PAD_T + (1 - (n - scale.floor) / span) * (H - PAD_T - PAD_B);
  };
  const moves = segments(logs);
  const spike = steepest(moves, "spike");
  const drop = steepest(moves, "drop");
  const first = logs[0];
  const last = logs[logs.length - 1];
  const line = logs
    .map((log, index) => `${index === 0 ? "M" : "L"}${xOf(log.log_date).toFixed(1)} ${yOf(log.listeners).toFixed(1)}`)
    .join(" ");
  const area =
    logs.length > 1 && first && last
      ? `${line} L${xOf(last.log_date).toFixed(1)} ${yOf(scale.floor).toFixed(1)} L${xOf(first.log_date).toFixed(1)} ${yOf(scale.floor).toFixed(1)} Z`
      : "";
  const dayMarks = active ? marks.filter((mark) => mark.log_date === active.log_date) : [];
  const labelMoves = moves.length <= 8 ? moves : moves.filter((item) => item === spike || item === drop || item.to.id === active?.id);

  return (
    <div className="chart-wrap">
      <div className="chart-readout">
        {active ? (
          <>
            <div>
              <b>{count(active.listeners)}</b>
              <span>
                {prettyDate(active.log_date)}
                {move ? ` · ${move.text}` : " · First log"}
                {active.note ? ` · ${active.note}` : ""}
              </span>
            </div>
            {logs.length > 1 ? (
              <div className="actions">
                <button className="btn small" type="button" disabled={activeIndex <= 0} onClick={() => setActiveId(logs[activeIndex - 1].id)}>
                  Earlier
                </button>
                <button className="btn small" type="button" disabled={activeIndex >= logs.length - 1} onClick={() => setActiveId(logs[activeIndex + 1].id)}>
                  Later
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div>
            <b>—</b>
            <span>Log a number. The next one draws the line.</span>
          </div>
        )}
      </div>
      {spike || drop ? (
        <div className="chart-moves">
          {spike ? (
            <span className="spike">
              Spike <b>+{count(spike.delta)}</b>
              <em>{prettyDate(spike.to.log_date)}</em>
            </span>
          ) : null}
          {drop ? (
            <span className="drop">
              Drop <b>−{count(Math.abs(drop.delta))}</b>
              <em>{prettyDate(drop.to.log_date)}</em>
            </span>
          ) : null}
        </div>
      ) : null}
      {dayMarks.length ? (
        <p className="meta">{dayMarks.map((mark) => `${labelFor(LOG_KINDS, mark.kind)} · ${mark.title}`).join("  ·  ")}</p>
      ) : null}
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={active ? `${count(active.listeners)} monthly listeners on ${prettyDate(active.log_date)}` : "Listener chart, empty"}>
        {ticksSafe(scale).map((tick) => (
          <g key={tick}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yOf(tick)} y2={yOf(tick)} stroke={tick === 100_000 ? "var(--ink)" : "var(--chart-grid)"} strokeWidth={tick === 100_000 ? 1.5 : 1} />
            <text x={PAD_L - 10} y={yOf(tick) + 4} fill="var(--faint)" fontSize="11" textAnchor="end">
              {compact(tick)}
            </text>
          </g>
        ))}
        {area ? <path d={area} fill="var(--ink)" opacity="0.08" /> : null}
        {moves.map((item) => {
          const x1 = xOf(item.from.log_date);
          const y1 = yOf(item.from.listeners);
          const x2 = xOf(item.to.log_date);
          const y2 = yOf(item.to.listeners);
          return (
            <line
              key={`${item.from.id}-${item.to.id}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={item.kind === "drop" ? "var(--hot)" : item.kind === "spike" ? "var(--good)" : "var(--ink)"}
              strokeWidth={item.kind === "flat" ? 1.5 : 2.75}
              strokeLinecap="round"
              opacity={item.kind === "flat" ? 0.45 : 1}
            />
          );
        })}
        {labelMoves.map((item) => {
          const x = (xOf(item.from.log_date) + xOf(item.to.log_date)) / 2;
          const y = (yOf(item.from.listeners) + yOf(item.to.listeners)) / 2;
          const below = item.kind === "drop";
          return (
            <text key={`label-${item.to.id}`} x={x} y={below ? y + 18 : y - 12} fill={item.kind === "drop" ? "var(--hot-read)" : item.kind === "spike" ? "var(--good-read)" : "var(--ink)"} fontSize="13" fontStyle="italic" textAnchor="middle">
              {item.kind === "drop" ? "−" : item.kind === "spike" ? "+" : ""}
              {item.kind === "flat" ? "Flat" : count(Math.abs(item.delta))}
            </text>
          );
        })}
        {marks.map((mark, index) => {
          const slot = marks.slice(0, index).filter((item) => item.log_date === mark.log_date).length;
          const x = xOf(mark.log_date) + slot * 14;
          return (
            <g key={mark.id}>
              <line x1={x} y1={10} x2={x} y2={PAD_T - 6} stroke="var(--ink)" strokeWidth="1" />
              <text x={x} y={9} fill="var(--ink)" fontSize="11" textAnchor="middle">
                {markLetter(mark.kind)}
              </text>
            </g>
          );
        })}
        {logs.map((log) => {
          const x = xOf(log.log_date);
          const y = yOf(log.listeners);
          const on = log.id === active?.id;
          const extreme = log.id === spike?.to.id || log.id === drop?.to.id;
          return (
            <g key={log.id}>
              <circle
                className="chart-hit"
                cx={x}
                cy={y}
                r="18"
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-label={`${prettyDate(log.log_date)}, ${count(log.listeners)}`}
                onClick={() => setActiveId(log.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveId(log.id);
                  }
                }}
              />
              {on || extreme ? <circle cx={x} cy={y} r="10" fill="none" stroke="var(--ink)" strokeWidth="1" opacity={on ? 1 : 0.45} /> : null}
              <circle cx={x} cy={y} r={on ? 5 : 4} fill={log.id === drop?.to.id && !on ? "var(--muted)" : "var(--ink)"} />
            </g>
          );
        })}
        {first ? (
          <text x={logs.length === 1 ? xOf(first.log_date) : PAD_L} y={H - 12} fill="var(--faint)" fontSize="11" textAnchor={logs.length === 1 ? "middle" : "start"}>
            {prettyDate(first.log_date)}
          </text>
        ) : null}
        {last && logs.length > 1 ? (
          <text x={W - PAD_R} y={H - 12} fill="var(--faint)" fontSize="11" textAnchor="end">
            {prettyDate(last.log_date)}
          </text>
        ) : null}
      </svg>
      {logs.length > 1 ? <p className="chart-note">The scale fits these logs, so a drop and a spike fill the chart.</p> : null}
      {marks.length ? (
        <p className="chart-legend">
          <span>P post</span>
          <span>R promo</span>
          <span>B blog</span>
          <span>L playlist</span>
        </p>
      ) : null}
    </div>
  );
}

function segments(logs: ListenerLog[]): Move[] {
  const moves: Move[] = [];
  for (let index = 1; index < logs.length; index += 1) {
    const from = logs[index - 1];
    const to = logs[index];
    const delta = to.listeners - from.listeners;
    moves.push({ from, to, delta, kind: delta > 0 ? "spike" : delta < 0 ? "drop" : "flat" });
  }
  return moves;
}

function steepest(moves: Move[], kind: "spike" | "drop") {
  return moves.reduce<Move | null>((best, item) => {
    if (item.kind !== kind) return best;
    if (!best) return item;
    return kind === "spike" ? (item.delta > best.delta ? item : best) : item.delta < best.delta ? item : best;
  }, null);
}

function axis(logs: ListenerLog[]) {
  if (!logs.length) return { floor: 0, ceiling: 100_000, step: 25_000 };
  const values = logs.map((log) => log.listeners);
  let low = Math.min(...values);
  let high = Math.max(...values);
  if (low === high) {
    const pad = Math.max(1_000, Math.round(low * 0.12));
    low = Math.max(0, low - pad);
    high += pad;
  } else {
    const pad = (high - low) * 0.45;
    low = Math.max(0, low - pad);
    high += pad;
  }
  const step = niceStep((high - low) / 4);
  const floor = Math.max(0, Math.floor(low / step) * step);
  const ceiling = Math.ceil(high / step) * step;
  return { floor, ceiling: Math.max(ceiling, floor + step), step };
}

function ticksSafe(scale: { floor: number; ceiling: number; step: number }) {
  const ticks: number[] = [];
  for (let tick = scale.floor; tick <= scale.ceiling + scale.step / 2; tick += scale.step) ticks.push(Math.round(tick));
  return ticks;
}

function niceStep(rough: number) {
  const safe = Math.max(rough, 1);
  const pow = 10 ** Math.floor(Math.log10(safe));
  const unit = safe / pow;
  const nice = unit < 1.5 ? 1 : unit < 3 ? 2 : unit < 7 ? 5 : 10;
  return nice * pow;
}

function stamp(date: string) {
  return new Date(`${date}T12:00:00`).getTime();
}

function deltaLabel(delta: number | null) {
  if (delta == null) return null;
  if (delta > 0) return { text: `Spike +${count(delta)}` };
  if (delta < 0) return { text: `Drop −${count(Math.abs(delta))}` };
  return { text: "Flat" };
}

function markLetter(kind: string) {
  if (kind === "promo") return "R";
  if (kind === "blog") return "B";
  if (kind === "playlist") return "L";
  return "P";
}
