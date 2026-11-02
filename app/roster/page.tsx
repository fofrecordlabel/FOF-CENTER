import Link from "next/link";
import { PageHeader, Pill, Balance } from "@/components/ui";
import { rosterRows } from "@/lib/db";
import { compact, money, rate } from "@/lib/format";
import { DEAL_TYPES, ROSTER_STAGES, STAGES, labelFor, stageTone } from "@/lib/labels";

export const metadata = { title: "Roster" };

export default async function RosterPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage } = await searchParams;
  const active = ROSTER_STAGES.some((item) => item.value === stage) ? stage : "all";
  const rows = rosterRows().filter((row) => active === "all" || row.artist.stage === active);

  return (
    <>
      <PageHeader kicker="Roster" title="On the label" lede="Signed artists. The file, the deal, and the recoupment balance.">
        <Link className="btn primary" href="/artists/new">
          Add to roster
        </Link>
      </PageHeader>
      <div className="filters">
        <Filter href="/roster" current={active === "all"}>
          All
        </Filter>
        {ROSTER_STAGES.map((item) => (
          <Filter key={item.value} href={`/roster?stage=${item.value}`} current={active === item.value}>
            {item.label}
          </Filter>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="empty">
          <p>No one is on the roster yet.</p>
          <Link className="btn primary" href="/artists/new">
            Add an artist
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Artist</th>
                <th>Stage</th>
                <th>Deal</th>
                <th className="num">Listeners</th>
                <th className="num">Advance</th>
                <th className="num">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.artist.id}>
                  <td>
                    <Link className="rowlink" href={`/artists/${row.artist.id}`}>
                      {row.artist.name}
                    </Link>
                    <div className="meta">{[row.artist.genre, row.artist.base_city, row.artist.ar_rep].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td>
                    <Pill tone={stageTone(row.artist.stage)}>{labelFor(STAGES, row.artist.stage)}</Pill>
                  </td>
                  <td>
                    {row.deal ? (
                      <>
                        {labelFor(DEAL_TYPES, row.deal.deal_type)}
                        <div className="meta">{rate(row.deal.royalty_rate)}</div>
                      </>
                    ) : (
                      <span className="meta">No deal</span>
                    )}
                  </td>
                  <td className="num">{compact(row.artist.monthly_listeners)}</td>
                  <td className="num">{money(row.advance)}</td>
                  <td className="num">
                    <Balance cents={row.balance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Filter({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link className={current ? "pill acid" : "pill"} href={href}>
      {children}
    </Link>
  );
}
