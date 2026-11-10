import postgres from "postgres";
import { runHeld } from "./held";
import type { SqlValue } from "./sql";

const globalForSql = globalThis as unknown as { fofSql?: postgres.Sql };

function deskUrl(raw: string) {
  // Session mode on the Supabase pooler allows 15 clients for the whole label.
  // Transaction mode shares those server connections, so warm site instances do not lock the desk out.
  let url = raw.includes(".pooler.supabase.com:5432")
    ? raw.replace(".pooler.supabase.com:5432", ".pooler.supabase.com:6543")
    : raw;
  if (!url.includes("search_path")) {
    url += `${url.includes("?") ? "&" : "?"}options=-c%20search_path%3Ddesk%20-c%20statement_timeout%3D45000`;
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
    max: 4,
    max_pipeline: 4,
    idle_timeout: 2,
    max_lifetime: 60,
    connect_timeout: 8,
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

let downUntil = 0;

function errorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return String(error.code);
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "";
}

function databaseDown(error: unknown) {
  const code = errorCode(error);
  const text = errorText(error);
  return code === "57P01" || code === "57P03" || code === "CONNECTION_CLOSED" || /not accepting connections|administrator command|no space left|CONNECTION_CLOSED/i.test(text);
}

function lockedOut(error: unknown) {
  const code = errorCode(error);
  return code === "EMAXCONNSESSION" || code === "ECONNRESET" || code === "08006" || code === "08001";
}

function fromHeld<T>(statement: string, args: SqlValue[]): T[] {
  const writing = /^\s*(insert|update|delete)\b/i.test(statement);
  const keep = /checklist_templates/i.test(statement) || /update artists set image_url/i.test(statement);
  if (writing && !keep) throw new Error("This did not save.");
  return runHeld<T>(statement, args);
}

function reading(statement: string) {
  return /^\s*(select|with)\b/i.test(statement);
}

export async function query<T>(statement: string, args: SqlValue[] = []): Promise<T[]> {
  if (Date.now() < downUntil) return fromHeld<T>(statement, args);
  const run = async () => {
    const sql = getSql();
    if (reading(statement)) {
      const rows = await sql.unsafe(toPg(statement), args as never[]);
      return [...rows] as T[];
    }
    const rows = await sql.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION READ WRITE");
      return await tx.unsafe(toPg(statement), args as never[]);
    });
    return [...rows] as T[];
  };
  const work = run();
  void work.catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error("The database is not accepting connections."), { code: "57P03" })), 4000);
      }),
    ]);
  } catch (error) {
    if (databaseDown(error)) {
      downUntil = Date.now() + 20000;
      await dropSql();
      return fromHeld<T>(statement, args);
    }
    if (!lockedOut(error)) throw error;
    await dropSql();
    return await run();
  } finally {
    if (timer) clearTimeout(timer);
  }
}
