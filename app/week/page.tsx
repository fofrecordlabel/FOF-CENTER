import { createLog, deleteLog, markLogDone } from "@/lib/actions";
import { ConfirmSubmit, SubmitButton } from "@/components/controls";
import { Banner, Field, PageHeader } from "@/components/ui";
import { listArtists, listLogs } from "@/lib/db";
import { prettyDate, today } from "@/lib/format";
import { LOG_KINDS, labelFor } from "@/lib/labels";

export const metadata = { title: "Week" };

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const artists = listArtists();
  const start = today();
  const days = Array.from({ length: 7 }, (_, index) => shift(start, index));
  const planned = listLogs().filter((entry) => entry.status === "planned");
  const later = planned.filter((entry) => entry.log_date > days[6] || entry.log_date < start);

  return (
    <>
      <PageHeader
        kicker="Coming up"
        title="Week ahead"
        lede="Posts and promo still to run. Mark one posted and it lands on the daily log and the listener line."
      />
      <Banner message={error} />

      <section className="card stack">
        <h2>Plan a day</h2>
        <form action={createLog} className="form-grid">
          <input type="hidden" name="next" value="/week" />
          <input type="hidden" name="status" value="planned" />
          <Field label="Date">
            <input name="log_date" type="date" required defaultValue={start} />
          </Field>
          <Field label="Kind">
            <select name="kind" defaultValue="post">
              {LOG_KINDS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title" wide>
            <input name="title" required placeholder="IG story, radio run, playlist pitch" />
          </Field>
          <Field label="Where">
            <input name="platform" placeholder="Instagram, blog, Spotify" />
          </Field>
          <Field label="Artist">
            <select name="artist_id" defaultValue={artists[0]?.id ?? ""}>
              <option value="">Label, not one artist</option>
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Note" wide>
            <textarea name="body" placeholder="What still has to go out." />
          </Field>
          <div className="actions wide">
            <SubmitButton label="Add to the week" />
          </div>
        </form>
      </section>

      {days.map((day) => {
        const entries = planned.filter((entry) => entry.log_date === day);
        return (
          <section className="log-day" key={day}>
            <h2>{day === start ? "Today" : prettyDate(day)}</h2>
            {entries.length === 0 ? <p className="meta">Nothing planned.</p> : null}
            {entries.map((entry) => (
              <article className="log-row" key={entry.id}>
                <span className="kind-mark">{labelFor(LOG_KINDS, entry.kind)}</span>
                <div className="stack">
                  <div>
                    <strong>{entry.title}</strong>
                    <p className="meta">{[entry.platform, entry.artist_name].filter(Boolean).join(" · ")}</p>
                    {entry.body ? <p>{entry.body}</p> : null}
                  </div>
                  <div className="actions">
                    <form action={markLogDone}>
                      <input type="hidden" name="id" value={entry.id} />
                      <input type="hidden" name="next" value="/week" />
                      <SubmitButton label="Mark posted" className="btn primary small" />
                    </form>
                    <form action={deleteLog}>
                      <input type="hidden" name="id" value={entry.id} />
                      <input type="hidden" name="next" value="/week" />
                      <ConfirmSubmit className="btn danger small" label="Remove" message={`Remove “${entry.title}” from the week?`} />
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </section>
        );
      })}

      {later.length ? (
        <section className="log-day">
          <h2>Outside this week</h2>
          {later.map((entry) => (
            <article className="log-row" key={entry.id}>
              <span className="kind-mark">{labelFor(LOG_KINDS, entry.kind)}</span>
              <div>
                <strong>{entry.title}</strong>
                <p className="meta">{prettyDate(entry.log_date)}</p>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </>
  );
}

function shift(day: string, days: number) {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dateNumber = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${dateNumber}`;
}
