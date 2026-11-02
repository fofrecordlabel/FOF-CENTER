import Link from "next/link";
import type { ReactNode } from "react";
import { initials, money, tone } from "@/lib/format";

export function PageHeader({
  kicker,
  title,
  lede,
  children,
}: {
  kicker: string;
  title: string;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {children ? <div className="actions">{children}</div> : null}
    </header>
  );
}

export function Banner({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="banner">{message}</p>;
}

export function Pill({ tone: toneName, children }: { tone?: string; children: ReactNode }) {
  return <span className={toneName ? `pill ${toneName}` : "pill"}>{children}</span>;
}

export function Mono({ name, image, large }: { name: string; image?: string | null; large?: boolean }) {
  return (
    <div className={large ? "mono lg" : "mono"} style={{ background: tone(name) }} aria-hidden>
      {image ? <img src={image} alt="" /> : initials(name)}
    </div>
  );
}

export function Balance({ cents }: { cents: number }) {
  if (cents < 0) return <span className="good-text">Recouped {money(Math.abs(cents))}</span>;
  if (cents === 0) return <span className="good-text">Recouped</span>;
  return <span className="hot-text">{money(cents)} unrecouped</span>;
}

export function BudgetBar({ budget, spent }: { budget: number; spent: number }) {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : spent > 0 ? 100 : 0;
  const over = budget > 0 && spent > budget;
  return (
    <div className="bar" title={`${money(spent)} of ${money(budget)}`}>
      <span style={{ width: `${pct}%`, background: over ? "var(--wax)" : "var(--acid)" }} />
    </div>
  );
}

export function Field({
  label,
  hint,
  wide,
  children,
}: {
  label: string;
  hint?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={wide ? "field wide" : "field"}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function ArtistName({ id, name }: { id: string; name: string }) {
  return (
    <Link className="rowlink" href={`/artists/${id}`}>
      {name}
    </Link>
  );
}
