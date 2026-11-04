import postgres from "postgres";
import type { SqlValue } from "./sql";

const globalForSql = globalThis as unknown as { fofSql?: postgres.Sql };

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. The desk saves to Supabase.");
  if (!globalForSql.fofSql) {
    globalForSql.fofSql = postgres(url, {
      ssl: "require",
      prepare: false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 30,
      connection: { search_path: "desk" },
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
  return globalForSql.fofSql;
}

function toPg(query: string) {
  let index = 0;
  return query.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

export async function query<T>(statement: string, args: SqlValue[] = []): Promise<T[]> {
  const rows = await getSql().unsafe(toPg(statement), args as never[]);
  return [...rows] as T[];
}
