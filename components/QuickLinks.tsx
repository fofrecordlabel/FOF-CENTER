"use client";

import { useEffect, useMemo, useState } from "react";
import { DESK_LINKS, LINK_GROUPS, type LinkGroup } from "@/lib/links";

const PIN_KEY = "fof-link-pins";

function byPin(pins: string[]) {
  return (a: (typeof DESK_LINKS)[number], b: (typeof DESK_LINKS)[number]) => {
    const pin = Number(pins.includes(b.id)) - Number(pins.includes(a.id));
    if (pin) return pin;
    return DESK_LINKS.indexOf(a) - DESK_LINKS.indexOf(b);
  };
}

function readPins() {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function QuickLinks({ mode = "board" }: { mode?: "board" | "dock" }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<LinkGroup | "All">("All");
  const [pins, setPins] = useState<string[]>([]);

  useEffect(() => {
    setPins(readPins());
  }, []);

  function togglePin(id: string) {
    setPins((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current.filter((item) => item !== id)];
      localStorage.setItem(PIN_KEY, JSON.stringify(next));
      return next;
    });
  }

  const links = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return DESK_LINKS.filter((link) => {
      if (group !== "All" && link.group !== group) return false;
      if (!needle) return true;
      return `${link.name} ${link.note} ${link.group} ${link.alias}`.toLowerCase().includes(needle);
    }).sort(byPin(pins));
  }, [group, pins, query]);

  if (mode === "dock") {
    const ordered = [...DESK_LINKS].sort(byPin(pins));
    return (
      <div className="link-dock" aria-label="Quicklinks">
        {ordered.map((link) => (
          <a
            key={link.id}
            className={pins.includes(link.id) ? "link-tile pinned" : "link-tile"}
            href={link.href}
            target="_blank"
            rel="noreferrer"
          >
            <span className={`link-mark ${link.group.toLowerCase()}`}>{link.mark}</span>
            <strong>{link.name}</strong>
            <em>{link.group}</em>
          </a>
        ))}
      </div>
    );
  }

  return (
    <section className="section stack">
      <div className="link-tools">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a desk"
          aria-label="Find a quicklink"
          enterKeyHint="search"
        />
        <p className="meta">{links.length} open</p>
      </div>
      <div className="filters link-filters" role="tablist" aria-label="Quicklink groups">
        {(["All", ...LINK_GROUPS] as const).map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={group === name}
            className={group === name ? "pill on" : "pill"}
            onClick={() => setGroup(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {links.length ? (
        <div className="link-board">
          {links.map((link) => {
            const pinned = pins.includes(link.id);
            return (
              <article key={link.id} className={pinned ? "link-card pinned" : "link-card"}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  <span className={`link-mark ${link.group.toLowerCase()}`}>{link.mark}</span>
                  <span className="link-copy">
                    <strong>{link.name}</strong>
                    <em>{link.note}</em>
                  </span>
                </a>
                <button
                  type="button"
                  className={pinned ? "link-pin on" : "link-pin"}
                  aria-pressed={pinned}
                  aria-label={pinned ? `Unpin ${link.name}` : `Pin ${link.name}`}
                  onClick={() => togglePin(link.id)}
                >
                  {pinned ? "Pinned" : "Pin"}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="meta">Nothing matches that search.</p>
      )}
    </section>
  );
}
