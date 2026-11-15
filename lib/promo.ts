import { money } from "./format";
import { EXPENSE_CATEGORIES, labelFor } from "./labels";
import type { Expense } from "./types";

const NAMED = /smmfollows|streamingmafia|instagram ad|tiktok ad/i;

export function spendMarks(expenses: Expense[]) {
  return expenses
    .filter((row) => row.category === "ads" || row.category === "promo" || row.category === "playlist" || NAMED.test(`${row.payee ?? ""} ${row.notes ?? ""}`))
    .map((row) => ({
      id: row.id,
      log_date: row.spent_on,
      kind: "spend",
      title: `${row.payee?.trim() || labelFor(EXPENSE_CATEGORIES, row.category)} · ${money(row.amount_cents)}`,
    }));
}
