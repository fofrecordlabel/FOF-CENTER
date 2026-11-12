import Link from "next/link";
import { archiveTemplate, createTodo, restoreTemplate, updateTemplate } from "@/lib/actions";
import { ChecklistLine, ReleaseField } from "@/components/Checklist";
import { ConfirmSubmit, SubmitButton } from "@/components/controls";
import { Banner, Field, PageHeader, ProgressMeter } from "@/components/ui";
import { checklistStats, dayStats, prettyReminder, sortTasks } from "@/lib/checklist";
import { listReleaseViews, listTemplates, listTodos } from "@/lib/db";
import { monthLabel, prettyDate, shortDate, today } from "@/lib/format";
import type { Todo } from "@/lib/types";

export const metadata = { title: "Checklist" };

export default async function ChecklistPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const day = today();
  const [todos, templates, releaseViews] = await Promise.all([listTodos(), listTemplates(), listReleaseViews()]);
  const releases = releaseViews.map((release) => ({ id: release.id, title: release.title }));
  const stats = checklistStats(todos, day);
  const days = checklistDays(todos, day);
  const todayLines = days.find(([date]) => date === day)?.[1] ?? [];
  const earlier = days.filter(([date]) => date < day);
  const upcoming = days.filter(([date]) => date > day);
  const standing = templates.filter((template) => Number(template.archived) !== 1);
  const archived = templates.filter((template) => Number(template.archived) === 1);

  return (
    <>
      <PageHeader
        kicker="Daily"
        title="Checklist"
        lede="The seven daily tasks start open again at midnight Eastern. Checking one saves the time, and every earlier day stays on the record."
      >
        <Link className="btn" href="/checklist/activity">
          Activity log
        </Link>
      </PageHeader>
      <Banner message={error} />

      <section className="card stack">
        <div className="section-head">
          <div>
            <p className="kicker">Today</p>
            <h2>{prettyDate(day)}</h2>
          </div>
          <span className={stats.today.percent === 100 ? "meta good-text" : "meta"}>
            {stats.today.total ? `${stats.today.missed} open` : "Waiting"}
          </span>
        </div>
        <ProgressMeter done={stats.today.done} total={stats.today.total} />
        <div className="task-list">
          {todayLines.map((todo) => (
            <ChecklistLine key={todo.id} todo={todo} next="/checklist" releases={releases} />
          ))}
        </div>
      </section>

      <section className="section stack">
        <div className="section-head">
          <div>
            <p className="kicker">Performance</p>
            <h2>From the saved days</h2>
          </div>
        </div>
        <div className="metric-grid">
          <article className="metric">
            <b className={stats.today.percent === 100 ? "good-text" : undefined}>{stats.today.total ? `${stats.today.percent}%` : "—"}</b>
            <span>Today</span>
          </article>
          <article className="metric">
            <b>{stats.weekCompleted}</b>
            <span>Completed this week{stats.weekTotal ? ` of ${stats.weekTotal}` : ""}</span>
          </article>
          <article className="metric">
            <b>{stats.monthCompleted}</b>
            <span>Completed this month{stats.monthTotal ? ` of ${stats.monthTotal}` : ""}</span>
          </article>
          <article className="metric">
            <b>{stats.streak}</b>
            <span>Day streak</span>
          </article>
        </div>
        <div className="grid-2">
          <article className="card stack">
            <h2>Best day</h2>
            {stats.best ? (
              <p>
                <Link href={`/checklist/activity?day=${stats.best.date}`}>{prettyDate(stats.best.date)}</Link>
                {" · "}
                {stats.best.percent}% · {stats.best.done}/{stats.best.total}
              </p>
            ) : (
              <p className="meta">No completed tasks yet.</p>
            )}
            <p className="meta">{stats.bestWeekday ? `${stats.bestWeekday.name} averages ${stats.bestWeekday.percent}%.` : "Weekday averages appear after a task is completed."}</p>
          </article>
          <article className="card stack">
            <h2>Week by week</h2>
            <Trend spans={stats.weeks.map((week) => ({ label: shortDate(week.from), percent: week.percent }))} />
          </article>
        </div>
        <article className="card stack">
          <h2>Month by month</h2>
          <Trend spans={stats.months.map((month) => ({ label: monthLabel(month.month).replace(/ \d{4}$/, ""), percent: month.percent }))} />
        </article>
      </section>

      <section className="card stack">
        <h2>Add a task</h2>
        <form action={createTodo} className="form-grid compact-form">
          <input type="hidden" name="next" value="/checklist" />
          <Field label="Day">
            <input name="todo_date" type="date" required defaultValue={day} />
          </Field>
          <Field label="Task" wide>
            <input name="title" required placeholder="A one-off, or a new daily task" enterKeyHint="done" />
          </Field>
          <Field label="Reminder">
            <input name="reminder" type="time" />
          </Field>
          <Field label="Note" wide>
            <input name="notes" placeholder="Optional" enterKeyHint="done" />
          </Field>
          <ReleaseField releases={releases} />
          <label className="check wide">
            <input type="checkbox" name="repeat" value="1" />
            <span>Repeat every day</span>
          </label>
          <div className="actions wide">
            <SubmitButton label="Add to the checklist" />
          </div>
        </form>
      </section>

      <details className="card drawer">
        <summary>Manage the daily tasks</summary>
        <p className="meta">These are the standing tasks. Each morning gets its own unchecked copy. Completed days are never wiped.</p>
        {standing.map((template) => (
          <div className="template-row" key={template.id}>
            <form action={updateTemplate} className="stack">
              <input type="hidden" name="id" value={template.id} />
              <input type="hidden" name="next" value="/checklist" />
              <div className="template-title">
                {template.locked ? <strong>{template.title}</strong> : <input name="title" required defaultValue={template.title} aria-label="Daily task" />}
                {template.locked ? <span className="pill good">Daily</span> : null}
                {template.reminder ? <span className="meta">Reminder {prettyReminder(template.reminder)}</span> : null}
              </div>
              {template.locked ? <input type="hidden" name="title" value={template.title} /> : null}
              <Field label="Standing note">
                <input name="notes" defaultValue={template.notes ?? ""} placeholder="Optional" />
              </Field>
              <Field label="Reminder">
                <input name="reminder" type="time" defaultValue={template.reminder ?? ""} />
              </Field>
              <ReleaseField releases={releases} selected={template.release_id} />
              <div className="actions">
                <SubmitButton label="Save" className="btn primary" />
              </div>
            </form>
            {template.locked ? null : <ArchiveButton id={template.id} title={template.title} />}
          </div>
        ))}
        {archived.length ? (
          <div className="stack">
            <h3>Archived</h3>
            {archived.map((template) => (
              <div className="template-title" key={template.id}>
                <strong>{template.title}</strong>
                <form action={restoreTemplate}>
                  <input type="hidden" name="id" value={template.id} />
                  <input type="hidden" name="next" value="/checklist" />
                  <SubmitButton label="Restore" className="btn" />
                </form>
              </div>
            ))}
          </div>
        ) : null}
      </details>

      {upcoming.length ? (
        <section className="section stack">
          <div className="section-head">
            <h2>Coming up</h2>
          </div>
          {upcoming.map(([date, lines]) => (
            <section className="card stack" key={date}>
              <div className="section-head">
                <h2>{prettyDate(date)}</h2>
              </div>
              <div className="task-list">
                {lines.map((todo) => (
                  <ChecklistLine key={todo.id} todo={todo} next="/checklist" releases={releases} />
                ))}
              </div>
            </section>
          ))}
        </section>
      ) : null}

      {earlier.length ? (
        <section className="section stack">
          <div className="section-head">
            <div>
              <p className="kicker">History</p>
              <h2>Earlier days</h2>
            </div>
            <Link href="/checklist/activity">Open the log</Link>
          </div>
          {earlier.map(([date, lines]) => {
            const count = dayStats(lines);
            return (
              <section className="card stack" key={date} id={`day-${date}`}>
                <div className="section-head">
                  <div>
                    <p className="kicker">{prettyDate(date)}</p>
                    <h2>{lines.length ? `${count.done}/${count.total} · ${count.percent}%` : "Nothing logged"}</h2>
                  </div>
                  <Link className="meta" href={`/checklist/activity?day=${date}`}>
                    {count.missed ? `${count.missed} missed` : "Clear"}
                  </Link>
                </div>
                <div className="task-list">
                  {lines.map((todo) => (
                    <ChecklistLine key={todo.id} todo={todo} next="/checklist" releases={releases} />
                  ))}
                </div>
              </section>
            );
          })}
        </section>
      ) : null}
    </>
  );
}

function ArchiveButton({ id, title }: { id: string; title: string }) {
  return (
    <form action={archiveTemplate}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="next" value="/checklist" />
      <ConfirmSubmit className="btn" label="Archive" message={`Archive “${title}”? Today stays as it is. It will not be added on future mornings.`} />
    </form>
  );
}

function Trend({ spans }: { spans: Array<{ label: string; percent: number | null }> }) {
  return (
    <div className="trend" aria-label="Completion trend">
      {spans.map((span) => (
        <div className="trend-col" key={span.label}>
          <i className={span.percent ? "fill" : undefined} style={{ height: `${span.percent == null ? 4 : Math.max(4, Math.round(span.percent * 0.72))}px` }} />
          <b>{span.percent == null ? "—" : `${span.percent}%`}</b>
          <em>{span.label}</em>
        </div>
      ))}
    </div>
  );
}

function checklistDays(todos: Todo[], day: string) {
  const grouped = new Map<string, Todo[]>();
  for (const todo of todos) {
    const lines = grouped.get(todo.todo_date) ?? [];
    lines.push(todo);
    grouped.set(todo.todo_date, lines);
  }
  if (!grouped.has(day)) grouped.set(day, []);
  return [...grouped.entries()]
    .sort((left, right) => right[0].localeCompare(left[0]))
    .map(([date, lines]) => [date, sortTasks(lines)] as const);
}
