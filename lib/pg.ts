import postgres from "postgres";
import type { SqlValue } from "./sql";

const globalForSql = globalThis as unknown as { fofSql?: postgres.Sql };

function deskUrl(raw: string) {
  // Session mode on the Supabase pooler allows 15 clients for the whole label.
  // Transaction mode shares those server connections, so warm site instances do not lock the desk out.
  let url = raw.includes(".pooler.supabase.com:5432")
    ? raw.replace(".pooler.supabase.com:5432", ".pooler.supabase.com:6543")
    : raw;
  if (!url.includes("search_path")) {
    url += `${url.includes("?") ? "&" : "?"}options=-c%20search_path%3Ddesk`;
  }
  return url;
}

function openSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. The desk saves to Supabase.");
  return postgres(deskUrl(url), {
    ssl: "require",
    prepare: false,
    fetch_types: false,
    max: 1,
    max_pipeline: 1,
    idle_timeout: 2,
    max_lifetime: 60,
    connect_timeout: 10,
    types: {
      int8: {
        to: 20,
        from: [20],
        parse: (value: string) => Number(value),
        serialize: (value: string | number) => String(value),
      },
    },
  });
}

export function getSql() {
  if (!globalForSql.fofSql) globalForSql.fofSql = openSql();
  return globalForSql.fofSql;
}

async function dropSql() {
  const sql = globalForSql.fofSql;
  globalForSql.fofSql = undefined;
  if (sql) await sql.end({ timeout: 1 }).catch(() => undefined);
}

function toPg(query: string) {
  let index = 0;
  return query.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

function lockedOut(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  return code === "EMAXCONNSESSION" || code === "ECONNRESET" || code === "57P01" || code === "08006" || code === "08001";
}

export async function query<T>(statement: string, args: SqlValue[] = []): Promise<T[]> {
  const run = () => getSql().unsafe(toPg(statement), args as never[]);
  try {
    return [...(await run())] as T[];
  } catch (error) {
    if (!lockedOut(error)) throw error;
    await dropSql();
    return [...(await run())] as T[];
  }
}
