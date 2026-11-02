export type SqlValue = string | number | bigint | null;

export type Stmt = {
  run(...args: SqlValue[]): unknown;
  get(...args: SqlValue[]): unknown;
  all(...args: SqlValue[]): unknown[];
};

export type Db = {
  exec(sql: string): void;
  prepare(sql: string): Stmt;
};

const IDENT = /^[a-z_]+$/;

export function insert(db: Db, table: string, row: Record<string, SqlValue>) {
  const keys = Object.keys(row);
  assertIdent(table);
  keys.forEach(assertIdent);
  db.prepare(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`).run(
    ...keys.map((key) => row[key] ?? null)
  );
}

export function updateRow(db: Db, table: string, id: string, row: Record<string, SqlValue>) {
  const keys = Object.keys(row);
  if (!keys.length) return;
  assertIdent(table);
  keys.forEach(assertIdent);
  db.prepare(`UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(", ")} WHERE id = ?`).run(
    ...keys.map((key) => row[key] ?? null),
    id
  );
}

export function removeRow(db: Db, table: string, id: string) {
  assertIdent(table);
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

export function transaction(db: Db, work: () => void) {
  db.exec("BEGIN");
  try {
    work();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function uid() {
  return crypto.randomUUID();
}

function assertIdent(value: string) {
  if (!IDENT.test(value)) throw new Error(`Unexpected identifier: ${value}`);
}
