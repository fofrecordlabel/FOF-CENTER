import Link from "next/link";
import { DealForm } from "@/components/RecordForms";
import { Banner, PageHeader, Pill } from "@/components/ui";
import { listArtists, listContractViews } from "@/lib/db";
import { money, prettyDate, rate, term } from "@/lib/format";
import { DEAL_STATUSES, DEAL_TYPES, labelFor, statusTone } from "@/lib/labels";

export const metadata = { title: "Business Affairs" };

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const deals = listContractViews();
  const artists = listArtists().map((artist) => ({ id: artist.id, name: artist.name }));

  return (
    <>
      <PageHeader kicker="Business affairs" title="Deals" lede="Term sheets through executed agreements. Only executed, recoupable advances hit the royalty balance." />
      <Banner message={error} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Deal</th>
              <th>Artist</th>
              <th>Status</th>
              <th>Term</th>
              <th className="num">Rate</th>
              <th className="num">Advance</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr key={deal.id}>
                <td>
                  <Link className="rowlink" href={`/artists/${deal.artist_id}#deals`}>{deal.title}</Link>
                  <div className="meta">{labelFor(DEAL_TYPES, deal.deal_type)} · {deal.territory || "—"}</div>
                </td>
                <td><Link className="rowlink" href={`/artists/${deal.artist_id}`}>{deal.artist_name}</Link></td>
                <td><Pill tone={statusTone(deal.status)}>{labelFor(DEAL_STATUSES, deal.status)}</Pill></td>
                <td>
                  {term(deal.term_years, deal.options)}
                  <div className="meta">{deal.effective_date ? prettyDate(deal.effective_date) : "Undated"}</div>
                </td>
                <td className="num">{rate(deal.royalty_rate)}</td>
                <td className="num">{money(deal.advance_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="section card stack">
        <h2>Add a deal</h2>
        <DealForm artists={artists} next="/deals" />
      </section>
    </>
  );
}
