import Link from "next/link";
import { ChecklistLine } from "@/components/Checklist";
import { Banner, PageHeader, ProgressMeter } from "@/components/ui";
import { dayStats, isDay, isMonth, monthCells, shiftDay, shiftMonth } from "@/lib/checklist";
import { listChecklistEvents, listReleaseViews, listTodos } from "@/lib/db";
import { clockTime, monthLabel, prettyDate, today } from "@/lib/format";

export const metadata = { title: "Activity log" };

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; day?: string; month?: string }>;
}) {
  const params = await searchParams;
  const current = today();
  const selected = isDay(params.day) ? params.day : current;
  const month = isMonth(params.month) ? params.month : selected.slice(0, 7);
  const [todos, events, releases] = await Promise.all([
    listTodos(),
    listChecklistEvents(),
    listReleaseViews().then((rows) => rows.map((release) => ({ id: release.id, title: release.title }))),
  ]);
  const lines = todos.filter((todo) => todo.todo_date === selected);
  const stats = dayStats(lines);
  const dayEvents = events.filter((event) => event.todo_date === selected);
  const cells = monthCells(month);
  const previousMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);
  const counts = new Map<string, { done: number; total: number }>();
  for (const todo of todos) {
    const count = counts.get(todo.todo_date) ?? { done: 0, total: 0 };
    count.total += 1;
    if (todo.done === 1) count.done += 1;
    counts.set(todo.todo_date, count);
  }
  const future = selected > current;
  const missedLabel = selected < current ? `${stats.missed} missed` : `${stats.missed} still open`;

  return (
    <>
      <PageHeader
        kicker="Record"
        title="Activity log"
        lede="Completed and unchecked tasks stay here with the Eastern time they were saved. Nothing in this log is estimated."
      >
        <Link className="btn" href="/checklist">
          Back to checklist
        </Link>
      </PageHeader>
      <Banner message={params.error} />

      <section className="card stack">
        <div className="cal-nav">
          <Link className="btn" href={`/checklist/activity?month=${previousMonth}&day=${selected}`}>
            Earlier
          </Link>
          <strong>{monthLabel(month)}</strong>
          {nextMonth <= current.slice(0, 7) ? (
            <Link className="btn" href={`/checklist/activity?month=${nextMonth}&day=${selected}`}>
              Later
            </Link>
          ) : (
            <span />
          )}
        </div>
        <div className="cal-week" aria-hidden>
          {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
        <div className="cal">
          {cells.map((date, index) => {
            if (!date) return <span className="pad" key={`pad-${index}`} />;
            const count = counts.get(date);
            const percent = count?.total ? Math.round((count.done / count.total) * 100) : null;
            const className = [
              date === selected ? "on" : "",
              date === current ? "today" : "",
              percent === 100 ? "complete" : "",
              percent === 0 ? "miss" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <Link key={date} href={`/checklist/activity?month=${month}&day=${date}`} className={className}>
                <b>{Number(date.slice(-2))}</b>
                <span>{percent == null ? "—" : `${percent}%`}</span>
              </Link>
            );
          })}
        </div>
        <form className="day-filters" action="/checklist/activity">
          <input type="hidden" name="month" value={month} />
          <Link className="pill" href={`/checklist/activity?day=${current}`}>
            Today
          </Link>
          <Link className="pill" href={`/checklist/activity?day=${shiftDay(current, -1)}`}>
            Yesterday
          </Link>
          <input name="day" type="date" defaultValue={selected} aria-label="Choose a day" />
          <button className="btn" type="submit">
            Show day
          </button>
        </form>
      </section>

      <section className="card stack">
        <div className="section-head">
          <div>
            <p className="kicker">{selected === current ? "Today" : prettyDate(selected)}</p>
            <h2>{prettyDate(selected)}</h2>
          </div>
          <span className="meta">{lines.length ? missedLabel : future ? "Not started" : "No list"}</span>
        </div>
        {lines.length ? <ProgressMeter done={stats.done} total={stats.total} label={`Checklist for ${prettyDate(selected)}`} /> : <p className="meta">{future ? "This day has not started." : "No checklist was saved for this day."}</p>}
        <div className="metric-grid">
          <article className="metric">
            <b>{lines.length ? stats.done : "—"}</b>
            <span>Completed</span>
          </article>
          <article className="metric">
            <b>{lines.length ? stats.missed : "—"}</b>
            <span>{selected < current ? "Missed" : "Open"}</span>
          </article>
          <article className="metric">
            <b>{lines.length ? `${stats.percent}%` : "—"}</b>
            <span>Completion</span>
          </article>
          <article className="metric">
            <b>{dayEvents.length}</b>
            <span>Log entries</span>
          </article>
        </div>
        <div className="task-list">
          {lines.map((todo) => (
            <ChecklistLine key={todo.id} todo={todo} next={`/checklist/activity?month=${month}&day=${selected}`} releases={releases} />
          ))}
        </div>
        {dayEvents.length ? (
          <ol className="event-list">
            {dayEvents.map((event) => (
              <li key={event.id}>
                <time dateTime={event.created_at}>{clockTime(event.created_at)} ET</time>
                <div>
                  <strong>{event.title}</strong>
                  <p className={event.action === "completed" ? "meta good-text" : "meta"}>
                    {event.action === "completed" ? "Completed" : "Unchecked"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </>
  );
}
