"use client";

import { useState } from "react";
import { compact, count, prettyDate } from "@/lib/format";
import { LOG_KINDS, labelFor } from "@/lib/labels";
import type { ListenerLog } from "@/lib/types";

export type ChartMark = { id: string; log_date: string; kind: string; title: string };

const GOAL = 100_000;
const W = 720;
const H = 280;
const PAD_L = 52;
const PAD_R = 16;
const PAD_T = 28;
const PAD_B = 32;

export function ListenerChart({ logs, marks }: { logs: ListenerLog[]; marks: ChartMark[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = logs.find((log) => log.id === activeId) ?? logs[logs.length - 1] ?? null;
  const activeIndex = active ? logs.findIndex((log) => log.id === active.id) : -1;
  const previous = activeIndex > 0 ? logs[activeIndex - 1] : null;
  const delta = active && previous ? active.listeners - previous.listeners : null;
  const move = deltaLabel(delta);
  const { ceiling, ticks } = axis(logs);
  const times = [...logs.map((log) => stamp(log.log_date)), ...marks.map((mark) => stamp(mark.log_date))];
  const minT = times.length ? Math.min(...times) : stamp("2000-01-01");
  const maxT = times.length ? Math.max(...times) : minT;
  const xOf = (date: string) => {
    if (maxT === minT) return (PAD_L + (W - PAD_R)) / 2;
    return PAD_L + ((stamp(date) - minT) / (maxT - minT)) * (W - PAD_L - PAD_R);
  };
  const yOf = (n: number) => PAD_T + (1 - n / ceiling) * (H - PAD_T - PAD_B);
  const line = logs
    .map((log, index) => `${index === 0 ? "M" : "L"}${xOf(log.log_date).toFixed(1)} ${yOf(log.listeners).toFixed(1)}`)
    .join(" ");
  const first = logs[0];
  const last = logs[logs.length - 1];
  const area =
    logs.length > 1 && first && last
      ? `${line} L${xOf(last.log_date).toFixed(1)} ${yOf(0).toFixed(1)} L${xOf(first.log_date).toFixed(1)} ${yOf(0).toFixed(1)} Z`
      : "";
  const dayMarks = active ? marks.filter((mark) => mark.log_date === active.log_date) : [];

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
            <span>Log a number. The line starts on this chart, from zero up to 100K.</span>
          </div>
        )}
      </div>
      {dayMarks.length ? (
        <p className="meta">
          {dayMarks.map((mark) => `${labelFor(LOG_KINDS, mark.kind)} · ${mark.title}`).join("  ·  ")}
        </p>
      ) : null}
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={active ? `${count(active.listeners)} monthly listeners on ${prettyDate(active.log_date)}` : "Listener chart, empty"}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yOf(tick)} y2={yOf(tick)} stroke={tick === GOAL ? "#ffffff" : "#2a2a2a"} strokeWidth={tick === GOAL ? 1.25 : 1} />
            <text x={PAD_L - 8} y={yOf(tick) + 4} fill={tick === GOAL ? "#ffffff" : "#737373"} fontSize="11" textAnchor="end">
              {tick === 0 ? "0" : compact(tick)}
            </text>
          </g>
        ))}
        {area ? <path d={area} fill="#ffffff" opacity="0.08" /> : null}
        {logs.length > 1 ? <path d={line} fill="none" stroke="#ffffff" strokeWidth="2" /> : null}
        {marks.map((mark, index) => {
          const slot = marks.slice(0, index).filter((item) => item.log_date === mark.log_date).length;
          const x = xOf(mark.log_date) + slot * 14;
          return (
            <g key={mark.id}>
              <line x1={x} y1={8} x2={x} y2={PAD_T} stroke="#ffffff" strokeWidth="1" />
              <text x={x} y={8} fill="#ffffff" fontSize="11" textAnchor="middle">
                {markLetter(mark.kind)}
              </text>
            </g>
          );
        })}
        {logs.map((log) => {
          const x = xOf(log.log_date);
          const y = yOf(log.listeners);
          const on = log.id === active?.id;
          const labelY = y < PAD_T + 28 ? y + 18 : y - 12;
          return (
            <g key={log.id}>
              <circle
                className="chart-hit"
                cx={x}
                cy={y}
                r="16"
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
              {on ? <circle cx={x} cy={y} r="9" fill="none" stroke="#ffffff" strokeWidth="1" /> : null}
              <circle cx={x} cy={y} r={on ? 5 : 3.5} fill="#ffffff" />
              {on ? (
                <text x={x} y={labelY} fill="#ffffff" fontSize="12" textAnchor="middle">
                  {count(log.listeners)}
                </text>
              ) : null}
            </g>
          );
        })}
        {first ? (
          <text x={logs.length === 1 ? xOf(first.log_date) : PAD_L} y={H - 10} fill="#737373" fontSize="11" textAnchor={logs.length === 1 ? "middle" : "start"}>
            {prettyDate(first.log_date)}
          </text>
        ) : null}
        {last && logs.length > 1 ? (
          <text x={W - PAD_R} y={H - 10} fill="#737373" fontSize="11" textAnchor="end">
            {prettyDate(last.log_date)}
          </text>
        ) : null}
      </svg>
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

function axis(logs: ListenerLog[]) {
  const peak = logs.reduce((max, log) => Math.max(max, log.listeners), 0);
  const step = peak <= GOAL ? 25_000 : peak <= 250_000 ? 50_000 : 100_000;
  const ceiling = Math.max(GOAL, Math.ceil(Math.max(peak, 1) / step) * step);
  const ticks: number[] = [];
  for (let tick = 0; tick <= ceiling; tick += step) ticks.push(tick);
  return { ceiling, ticks };
}

function stamp(date: string) {
  return new Date(`${date}T12:00:00`).getTime();
}

function deltaLabel(delta: number | null) {
  if (delta == null) return null;
  if (delta > 0) return { text: `Gain ${count(delta)}` };
  if (delta < 0) return { text: `Drop ${count(Math.abs(delta))}` };
  return { text: "Flat" };
}

function markLetter(kind: string) {
  if (kind === "promo") return "R";
  if (kind === "blog") return "B";
  if (kind === "playlist") return "L";
  return "P";
}
