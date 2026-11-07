"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { DraftKeeper } from "./DraftKeeper";
import { DeskAlerts } from "./DeskAlerts";
import { SavedNotice } from "./SavedNotice";
import type { DeskAlert } from "@/lib/alerts";

const TABS = [
  { href: "/", label: "Desk" },
  { href: "/checklist", label: "Checklist" },
  { href: "/log", label: "Log" },
  { href: "/#listeners", label: "Listeners" },
];

const NAV = [
  { href: "/", label: "Desk" },
  { href: "/checklist", label: "Checklist" },
  { href: "/checklist/activity", label: "Activity" },
  { href: "/pipeline", label: "A&R Pipeline" },
  { href: "/roster", label: "Roster" },
  { href: "/catalog", label: "Catalog" },
  { href: "/log", label: "Daily log" },
  { href: "/week", label: "Week" },
  { href: "/influencers", label: "Contacts" },
  { href: "/art", label: "Cover Art" },
  { href: "/releases", label: "Releases" },
  { href: "/deals", label: "Business Affairs" },
  { href: "/people", label: "Directory" },
  { href: "/projects", label: "Budgets" },
  { href: "/spend", label: "Spending" },
];

export function Shell({ children, alerts, day }: { children: ReactNode; alerts: DeskAlert[]; day: string }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const active = (href: string) => {
    if (href === "/") return path === "/";
    if (href === "/checklist") return path === "/checklist";
    return path === href || path.startsWith(`${href}/`);
  };
  const tabActive = (href: string) => (href === "/checklist" ? path.startsWith("/checklist") : active(href));
  const here = NAV.find((item) => active(item.href))?.label ?? "Desk";

  useEffect(() => {
    setMenu(false);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  return (
    <div className={menu ? "shell menu-open" : "shell"}>
      <aside className="rail">
        <Link className="brand" href="/">
          <img className="brand-logo" src="/brand/fof.png" alt="FOF Records" />
          <em>Label desk</em>
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
            <button
              type="button"
              className="menu-button"
              aria-label={menu ? "Close sections" : "Open sections"}
              aria-expanded={menu}
              onClick={() => setMenu((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
            <Link className="mobile-brand" href="/" aria-label="FOF Records">
              <img className="brand-logo" src="/brand/fof.png" alt="" />
            </Link>
            <p className="phone-here">{here}</p>
            <p className="kicker desk-kicker">FOF Records · Internal</p>
            <form className="search" action="/search" method="get">
              <input name="q" placeholder="Search the desk" aria-label="Search the desk" enterKeyHint="search" />
            </form>
          </div>
          <Suspense fallback={null}>
            <DraftKeeper />
            <SavedNotice />
          </Suspense>
          <DeskAlerts alerts={alerts} day={day} />
          {children}
        </div>
      </div>
      <nav className="tabbar" aria-label="Favorites">
        {TABS.map((item) => (
          <Link key={item.href} href={item.href} className={tabActive(item.href) ? "active" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
      {menu ? (
        <nav className="phone-menu" aria-label="Sections">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={active(item.href) ? "active" : undefined}>
              {item.label}
            </Link>
          ))}
          <Link className="btn primary" href="/artists/new">
            Add artist
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
