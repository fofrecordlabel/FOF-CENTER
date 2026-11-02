"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Desk" },
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

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

  return (
    <div className="shell">
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
            <p className="kicker">FOF Records · Internal</p>
            <form className="search" action="/search" method="get">
              <input name="q" placeholder="Search artists, masters, people" aria-label="Search the desk" />
            </form>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
