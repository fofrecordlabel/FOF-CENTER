import { query } from "./pg";

export type SqlValue = string | number | bigint | null;

const IDENT = /^[a-z_]+$/;

export async function insert(table: string, row: Record<string, SqlValue>) {
  const keys = Object.keys(row);
  assertIdent(table);
  keys.forEach(assertIdent);
  await query(
    `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
    keys.map((key) => row[key] ?? null)
  );
}

export async function updateRow(table: string, id: string, row: Record<string, SqlValue>) {
  const keys = Object.keys(row);
  if (!keys.length) return;
  assertIdent(table);
  keys.forEach(assertIdent);
  await query(
    `UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(", ")} WHERE id = ?`,
    [...keys.map((key) => row[key] ?? null), id]
  );
}

export async function removeRow(table: string, id: string) {
  assertIdent(table);
  await query(`DELETE FROM ${table} WHERE id = ?`, [id]);
}

export async function exec(statement: string, ...args: SqlValue[]) {
  await query(statement, args);
}

export function uid() {
  return crypto.randomUUID();
}

function assertIdent(value: string) {
  if (!IDENT.test(value)) throw new Error(`Unexpected identifier: ${value}`);
}
