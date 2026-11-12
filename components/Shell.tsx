"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";
import { DraftKeeper } from "./DraftKeeper";
import { DeskAlerts } from "./DeskAlerts";
import { QuietSave } from "./QuietSave";
import { SavedNotice } from "./SavedNotice";
import { ThemeToggle } from "./ThemeToggle";
import type { DeskAlert } from "@/lib/alerts";

function tabDot(href: string, alerts: { id: string; href: string }[]) {
  if (href === "/") return alerts.some((alert) => alert.id.startsWith("post-") || alert.href === "/week");
  if (href === "/checklist") return alerts.some((alert) => alert.href === "/checklist");
  if (href === "/#listeners") return alerts.some((alert) => alert.href.includes("listeners"));
  return false;
}

const TABS = [
  { href: "/", label: "Desk" },
  { href: "/checklist", label: "Checklist" },
  { href: "/log", label: "Log" },
  { href: "/#listeners", label: "Listeners" },
];

const GROUPS = [
  {
    label: "Today",
    items: [
      { href: "/", label: "Desk" },
      { href: "/checklist", label: "Checklist" },
      { href: "/checklist/activity", label: "Activity" },
      { href: "/log", label: "Daily log" },
      { href: "/week", label: "Week" },
    ],
  },
  {
    label: "Music",
    items: [
      { href: "/releases", label: "Releases" },
      { href: "/catalog", label: "Catalog" },
      { href: "/art", label: "Cover Art" },
      { href: "/roster", label: "Roster" },
      { href: "/pipeline", label: "A&R Pipeline" },
    ],
  },
  {
    label: "Office",
    items: [
      { href: "/influencers", label: "Contacts" },
      { href: "/people", label: "Directory" },
      { href: "/deals", label: "Business Affairs" },
      { href: "/projects", label: "Budgets" },
      { href: "/spend", label: "Spending" },
    ],
  },
];

const NAV = GROUPS.flatMap((group) => group.items);

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

  return (
    <div className={menu ? "shell menu-open" : "shell"}>
      <aside className="rail">
        <Link className="brand" href="/">
          <BrandLogo alt="FOF Records" />
          <em>Label desk</em>
        </Link>
        <nav className="nav">
          {GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className={active(item.href) ? "active" : undefined}>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="grow" />
        <Link className="btn primary" href="/artists/new">
          Add artist
        </Link>
        <ThemeToggle />
        <p className="rail-foot">Internal</p>
      </aside>
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
          <BrandLogo alt="" />
        </Link>
        <p className="phone-here">{here}</p>
        <p className="kicker desk-kicker">FOF Records · Internal</p>
        <ThemeToggle />
        <form className="search" action="/search" method="get">
          <input name="q" placeholder="Search the desk" aria-label="Search the desk" enterKeyHint="search" />
        </form>
      </div>
      <div className="main">
        <div className="wrap">
          <Suspense fallback={null}>
            <DraftKeeper />
            <SavedNotice />
            <QuietSave />
          </Suspense>
          <DeskAlerts alerts={alerts} day={day} />
          {children}
        </div>
      </div>
      <nav className="tabbar" aria-label="Favorites">
        {TABS.map((item) => (
          <Link key={item.href} href={item.href} className={tabActive(item.href) ? "active" : undefined}>
            {item.label}
            {tabDot(item.href, alerts) ? <i className="tab-dot" aria-label="Waiting" /> : null}
          </Link>
        ))}
      </nav>
      {menu ? (
        <nav className="phone-menu" aria-label="Sections">
          {GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className={active(item.href) ? "active" : undefined}>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          <Link className="btn primary" href="/artists/new">
            Add artist
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
