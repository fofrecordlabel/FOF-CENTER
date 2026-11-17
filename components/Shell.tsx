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

function TabIcon({ name }: { name: string }) {
  const props = {
    className: "tab-icon",
    viewBox: "0 0 24 24",
    width: 20,
    height: 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "check") {
    return (
      <svg {...props}>
        <path d="M8 6h11" />
        <path d="M8 12h11" />
        <path d="M8 18h11" />
        <path d="M4 6.5 5.2 8 7.5 5" />
        <path d="M4 12.5 5.2 14 7.5 11" />
        <path d="M4 18.5 5.2 20 7.5 17" />
      </svg>
    );
  }
  if (name === "log") {
    return (
      <svg {...props}>
        <path d="M7 4h8l4 4v12H7z" />
        <path d="M15 4v4h4" />
        <path d="M10 12h6" />
        <path d="M10 16h4" />
      </svg>
    );
  }
  if (name === "wave") {
    return (
      <svg {...props}>
        <path d="M3 14c2 0 2-4 4-4s2 4 4 4 2-4 4-4 2 4 4 4" />
        <path d="M3 18c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 4 3" />
      </svg>
    );
  }
  if (name === "link") {
    return (
      <svg {...props}>
        <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
        <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="4" rx="1.5" />
      <rect x="13" y="10" width="7" height="10" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function tabDot(href: string, alerts: { id: string; href: string }[]) {
  if (href === "/") return alerts.some((alert) => alert.id.startsWith("post-") || alert.href === "/week");
  if (href === "/checklist") return alerts.some((alert) => alert.href === "/checklist");
  if (href === "/#listeners") return alerts.some((alert) => alert.href.includes("listeners"));
  return false;
}

const TABS = [
  { href: "/", label: "Desk", icon: "desk" },
  { href: "/checklist", label: "Checklist", icon: "check" },
  { href: "/log", label: "Log", icon: "log" },
  { href: "/#listeners", label: "Listeners", icon: "wave" },
  { href: "/links", label: "Links", icon: "link" },
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
  {
    label: "Outside",
    items: [{ href: "/links", label: "Quicklinks" }],
  },
  {
    label: "Library",
    items: [{ href: "/files", label: "Gallery & files" }],
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
            <TabIcon name={item.icon} />
            <span>{item.label}</span>
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
