"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { DraftKeeper } from "./DraftKeeper";
import { SavedNotice } from "./SavedNotice";

const NAV = [
  { href: "/", label: "Desk" },
  { href: "/checklist", label: "Checklist" },
  { href: "/pipeline", label: "A&R Pipeline" },
  { href: "/roster", label: "Roster" },
  { href: "/catalog", label: "Catalog" },
  { href: "/log", label: "Daily log" },
  { href: "/week", label: "Week" },
  { href: "/influencers", label: "Influencers" },
  { href: "/art", label: "Cover Art" },
  { href: "/releases", label: "Releases" },
  { href: "/deals", label: "Business Affairs" },
  { href: "/people", label: "Directory" },
  { href: "/projects", label: "Budgets" },
];

const TABS = [
  { href: "/", label: "Desk" },
  { href: "/log", label: "Log" },
  { href: "/week", label: "Week" },
  { href: "/influencers", label: "Book" },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

  useEffect(() => {
    setMore(false);
  }, [path]);

  return (
    <div className={more ? "shell more-open" : "shell"}>
      <aside className="rail">
        <Link className="brand" href="/">
          <span className="mark">FOF</span>
          <span>
            <strong>FOF Records</strong>
            <em>Label desk</em>
          </span>
        </Link>
        <nav className="nav">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={active(item.href) ? "active" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="grow" />
        <Link className="btn primary" href="/artists/new">
          Add artist
        </Link>
        <p className="rail-foot">Internal</p>
      </aside>
      <div className="main">
        <div className="wrap">
          <div className="topbar">
            <Link className="mobile-brand" href="/" aria-label="Desk">
              <span className="mark">FOF</span>
            </Link>
            <p className="kicker desk-kicker">FOF Records · Internal</p>
            <form className="search" action="/search" method="get">
              <input name="q" placeholder="Search the desk" aria-label="Search the desk" enterKeyHint="search" />
            </form>
          </div>
          <Suspense fallback={null}>
            <DraftKeeper />
            <SavedNotice />
          </Suspense>
          {children}
        </div>
      </div>
      <nav className="tabbar" aria-label="Sections">
        {TABS.map((item) => (
          <Link key={item.href} href={item.href} className={active(item.href) ? "active" : undefined}>
            {item.label}
          </Link>
        ))}
        <button type="button" className={more ? "active" : undefined} aria-expanded={more} onClick={() => setMore((open) => !open)}>
          More
        </button>
      </nav>
      {more ? (
        <div className="more-sheet" role="dialog" aria-label="All sections">
          <div className="more-grid">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={active(item.href) ? "active" : undefined}>
                {item.label}
              </Link>
            ))}
            <Link className="btn primary" href="/artists/new">
              Add artist
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
