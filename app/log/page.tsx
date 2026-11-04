import Link from "next/link";
import { createLog, deleteLog, updateLog } from "@/lib/actions";
import { ConfirmSubmit, SubmitButton } from "@/components/controls";
import { Banner, Field, PageHeader } from "@/components/ui";
import { listArtists, listLogs } from "@/lib/db";
import { prettyDate, today } from "@/lib/format";
import { LOG_KINDS, labelFor } from "@/lib/labels";
import type { LogView } from "@/lib/types";

export const metadata = { title: "Daily log" };

const FILTERS = [
  { href: "/log", value: "", label: "All" },
  { href: "/log?kind=post", value: "post", label: "Posts" },
  { href: "/log?kind=promo", value: "promo", label: "Promo" },
  { href: "/log?kind=blog", value: "blog", label: "Blogs" },
  { href: "/log?kind=playlist", value: "playlist", label: "Playlists" },
];

export default async function LogPage({ searchParams }: { searchParams: Promise<{ error?: string; kind?: string }> }) {
  const { error, kind } = await searchParams;
  const active = FILTERS.some((item) => item.value === kind) ? kind : "";
  const artists = await listArtists();
  const logs = (await listLogs()).filter((entry) => entry.status !== "planned" && (active ? entry.kind === active : true));
  const groups = groupByDate(logs);
  const day = today();

  return (
    <>
      <PageHeader
        kicker="Today"
        title="Daily log"
        lede="What went out. A post, a promo run, a blog, or a playlist add. Plans for the days ahead live on the week."
      />
      <Banner message={error} />
      <div className="filters">
        {FILTERS.map((item) => (
          <Link key={item.label} className={item.value === (active ?? "") ? "pill acid" : "pill"} href={item.href}>
            {item.label}
          </Link>
        ))}
      </div>

      <section className="card stack">
        <h2>Log today</h2>
        <LogForm artists={artists} date={day} />
      </section>

      {groups.length === 0 ? (
        <div className="empty section">
          <p>Nothing in the log yet. Post, promo, and blogs go here.</p>
        </div>
      ) : (
        groups.map((group) => (
          <section className="log-day" key={group.date}>
            <h2>{group.date === day ? "Today" : prettyDate(group.date)}</h2>
            {group.date === day ? <p className="meta">{prettyDate(group.date)}</p> : null}
            {group.entries.map((entry) => (
              <article className="log-row" key={entry.id}>
                <span className="kind-mark">{labelFor(LOG_KINDS, entry.kind)}</span>
                <div className="stack">
                  <div>
                    <strong>{entry.title}</strong>
                    <p className="meta">
                      {[entry.platform, entry.artist_name].filter(Boolean).join(" · ")}
                    </p>
                    {entry.body ? <p>{entry.body}</p> : null}
                    {entry.link ? (
                      <a href={entry.link} target="_blank" rel="noreferrer">
                        {entry.link}
                      </a>
                    ) : null}
                  </div>
                  <details className="drawer">
                    <summary>Edit</summary>
                    <LogForm artists={artists} entry={entry} />
                  </details>
                  <form action={deleteLog}>
                    <input type="hidden" name="id" value={entry.id} />
                    <input type="hidden" name="next" value="/log" />
                    <ConfirmSubmit className="btn danger small" label="Remove" message={`Remove “${entry.title}” from the log?`} />
                  </form>
                </div>
              </article>
            ))}
          </section>
        ))
      )}
    </>
  );
}

function LogForm({
  artists,
  date,
  entry,
}: {
  artists: { id: string; name: string }[];
  date?: string;
  entry?: LogView;
}) {
  return (
    <form action={entry ? updateLog : createLog} className="form-grid">
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <input type="hidden" name="next" value="/log" />
      <input type="hidden" name="status" value={entry?.status ?? "done"} />
      <Field label="Date">
        <input name="log_date" type="date" required defaultValue={entry?.log_date ?? date ?? ""} />
      </Field>
      <Field label="Kind">
        <select name="kind" defaultValue={entry?.kind ?? "post"}>
          {LOG_KINDS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Title" wide>
        <input name="title" required defaultValue={entry?.title ?? ""} placeholder="IG story, radio run, blog draft" />
      </Field>
      <Field label="Where">
        <input name="platform" defaultValue={entry?.platform ?? ""} placeholder="Instagram, blog, radio" />
      </Field>
      <Field label="Artist">
        <select name="artist_id" defaultValue={entry?.artist_id ?? ""}>
          <option value="">Label, not one artist</option>
          {artists.map((artist) => (
            <option key={artist.id} value={artist.id}>
              {artist.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Link" wide>
        <input name="link" defaultValue={entry?.link ?? ""} placeholder="https://" />
      </Field>
      <Field label="What happened" wide>
        <textarea name="body" defaultValue={entry?.body ?? ""} placeholder="What you posted, who you hit, or the blog you wrote." />
      </Field>
      <div className="actions wide">
        <SubmitButton label={entry ? "Save entry" : "Add to the log"} />
      </div>
    </form>
  );
}

function groupByDate(logs: LogView[]) {
  const groups: { date: string; entries: LogView[] }[] = [];
  for (const entry of logs) {
    const last = groups[groups.length - 1];
    if (last && last.date === entry.log_date) last.entries.push(entry);
    else groups.push({ date: entry.log_date, entries: [entry] });
  }
  return groups;
}
