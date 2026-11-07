"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function PhoneBook({ prefix, letters, children }: { prefix: string; letters: string[]; children: ReactNode }) {
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const book = root.current;
    if (!book) return;
    const needle = query.trim().toLowerCase();
    book.querySelectorAll<HTMLElement>("[data-name]").forEach((row) => {
      row.hidden = Boolean(needle) && !(row.dataset.name ?? "").includes(needle);
    });
    book.querySelectorAll<HTMLElement>("[data-letter]").forEach((section) => {
      section.hidden = ![...section.querySelectorAll<HTMLElement>("[data-name]")].some((row) => !row.hidden);
    });
  }, [query]);

  return (
    <div className="phonebook" ref={root}>
      <input
        className="phonebook-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search"
        aria-label="Search"
        enterKeyHint="search"
      />
      <div className="phonebook-scroll">{children}</div>
      <nav className="phonebook-index" aria-label="Letters">
        {letters.map((letter) => (
          <button
            key={letter}
            type="button"
            onClick={() => document.getElementById(`${prefix}-${letter}`)?.scrollIntoView({ block: "start" })}
          >
            {letter}
          </button>
        ))}
      </nav>
    </div>
  );
}
