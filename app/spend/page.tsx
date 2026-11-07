import { createExpense, deleteExpense } from "@/lib/actions";
import { ConfirmSubmit } from "@/components/controls";
import { Banner, PageHeader } from "@/components/ui";
import { isMonth, shiftMonth } from "@/lib/checklist";
import { listExpenses } from "@/lib/db";
import { money, monthLabel, prettyDate, today } from "@/lib/format";
import { EXPENSE_CATEGORIES, labelFor } from "@/lib/labels";

export const metadata = { title: "Spending" };

export default async function SpendPage({ searchParams }: { searchParams: Promise<{ error?: string; month?: string }> }) {
  const { error, month: requested } = await searchParams;
  const current = today().slice(0, 7);
  const month = isMonth(requested) ? requested : current;
  const expenses = await listExpenses();
  const months = trailingMonths(current, 12);
  const peak = Math.max(...months.map((item) => spentIn(expenses, item)), 1);
  const monthRows = expenses.filter((row) => row.spent_on.startsWith(month));
  const monthTotal = monthRows.reduce((sum, row) => sum + row.amount_cents, 0);
  const categories = EXPENSE_CATEGORIES.map((category) => ({
    ...category,
    cents: monthRows.filter((row) => row.category === category.value).reduce((sum, row) => sum + row.amount_cents, 0),
  })).filter((category) => category.cents > 0);

  return (
    <>
      <PageHeader
        kicker="Money out"
        title="Spending"
        lede="Every amount is saved. Open a month to see where it went."
      />
      <Banner message={error} />
      <section className="card stack">
        <div className="section-head">
          <h2>Last 12 months</h2>
          <span className="meta">{money(expenses.reduce((sum, row) => sum + row.amount_cents, 0))} saved</span>
        </div>
        <div className="spend-chart">
          {months.map((item) => {
            const cents = spentIn(expenses, item);
            return (
              <a className={item === month ? "spend-bar on" : "spend-bar"} href={`/spend?month=${item}`} key={item}>
                <span style={{ height: `${Math.max(4, Math.round((cents / peak) * 120))}px` }} />
                <b>{cents ? money(cents) : "—"}</b>
                <small>{monthLabel(item).slice(0, 3)}</small>
              </a>
            );
          })}
        </div>
      </section>

      <section className="card stack">
        <div className="section-head">
          <div>
            <p className="kicker">Report</p>
            <h2>{monthLabel(month)}</h2>
          </div>
          <b>{money(monthTotal)}</b>
        </div>
        <div className="actions">
          <a className="btn small" href={`/spend?month=${shiftMonth(month, -1)}`}>
            Earlier month
          </a>
          {month < current ? (
            <a className="btn small" href={`/spend?month=${shiftMonth(month, 1)}`}>
              Later month
            </a>
          ) : null}
        </div>
        {categories.length === 0 ? <p className="meta">Nothing logged this month.</p> : null}
        {categories.map((category) => (
          <div className="category-line" key={category.value}>
            <span>{category.label}</span>
            <span className="category-track">
              <span style={{ width: `${Math.round((category.cents / monthTotal) * 100)}%` }} />
            </span>
            <b>{money(category.cents)}</b>
          </div>
        ))}
        {monthRows.map((row) => (
          <article className="expense-line" key={row.id}>
            <div>
              <strong>{money(row.amount_cents)}</strong>
              <p className="meta">
                {prettyDate(row.spent_on)} · {labelFor(EXPENSE_CATEGORIES, row.category)}
                {row.payee ? ` · ${row.payee}` : ""}
              </p>
              {row.notes ? <p className="meta">{row.notes}</p> : null}
            </div>
            <form action={deleteExpense}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="next" value={`/spend?month=${month}`} />
              <ConfirmSubmit className="btn danger small" label="Remove" message="Remove this expense? The month report will update." />
            </form>
          </article>
        ))}
      </section>

      <section className="card stack">
        <h2>Log spending</h2>
        <form action={createExpense} className="form-grid">
          <input type="hidden" name="next" value={`/spend?month=${month}`} />
          <label className="field">
            <span>Date</span>
            <input name="spent_on" type="date" required defaultValue={month === current ? today() : `${month}-01`} />
          </label>
          <label className="field">
            <span>Amount, USD</span>
            <input name="amount" inputMode="decimal" min="0" step="0.01" required placeholder="0.00" />
          </label>
          <label className="field wide">
            <span>Category</span>
            <select name="category" defaultValue="ads">
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Paid to</span>
            <input name="payee" placeholder="Who got the money" />
          </label>
          <label className="field wide">
            <span>Note</span>
            <input name="notes" placeholder="What it was for" />
          </label>
          <div className="actions wide">
            <button className="btn primary" type="submit">
              Save expense
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

function trailingMonths(current: string, count: number) {
  const months = [current];
  let cursor = current;
  for (let index = 1; index < count; index += 1) {
    cursor = shiftMonth(cursor, -1);
    months.unshift(cursor);
  }
  return months;
}

function spentIn(rows: { spent_on: string; amount_cents: number }[], month: string) {
  return rows.filter((row) => row.spent_on.startsWith(month)).reduce((sum, row) => sum + row.amount_cents, 0);
}
