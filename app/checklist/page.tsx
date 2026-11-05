import Link from "next/link";
import { createTodo, deleteTemplate, updateTemplate } from "@/lib/actions";
import { ChecklistLine, ReleaseField } from "@/components/Checklist";
import { ConfirmSubmit, SubmitButton } from "@/components/controls";
import { Banner, Field, PageHeader } from "@/components/ui";
import { listReleaseViews, listTemplates, listTodos } from "@/lib/db";
import { prettyDate, today } from "@/lib/format";
import type { Todo } from "@/lib/types";

export const metadata = { title: "Checklist" };

export default async function ChecklistPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const day = today();
  const todos = await listTodos();
  const templates = await listTemplates();
  const releases = (await listReleaseViews()).map((release) => ({ id: release.id, title: release.title }));
  const days = checklistDays(todos, day);

  return (
    <>
      <PageHeader
        kicker="Daily"
        title="Checklist"
        lede="Every day stays on the desk. Check a line when it is done and the time is saved with it."
      >
        <Link className="btn" href="/">
          Back to the desk
        </Link>
      </PageHeader>
      <Banner message={error} />
      <section className="card stack">
        <h2>Add a line</h2>
        <form action={createTodo} className="form-grid compact-form">
          <input type="hidden" name="next" value="/checklist" />
          <Field label="Day">
            <input name="todo_date" type="date" required defaultValue={day} />
          </Field>
          <Field label="Line" wide>
            <input name="title" required placeholder="Send the cover, call the plug, book the post" enterKeyHint="done" />
          </Field>
          <ReleaseField releases={releases} />
          <label className="check wide">
            <input type="checkbox" name="repeat" value="1" />
            <span>Every day</span>
          </label>
          <div className="actions wide">
            <SubmitButton label="Add to the checklist" />
          </div>
        </form>
      </section>
      <section className="card stack">
        <div className="section-head">
          <div>
            <p className="kicker">Standing</p>
            <h2>Every day</h2>
          </div>
        </div>
        {templates.length === 0 ? <p className="meta">Check “Every day” when you add a line, and it lands on each new morning still open.</p> : null}
        {templates.map((template) => (
          <div className="check-edit" key={template.id}>
            <form action={updateTemplate} className="compact-form stack">
              <input type="hidden" name="id" value={template.id} />
              <input type="hidden" name="next" value="/checklist" />
              <input name="title" required defaultValue={template.title} aria-label="Daily line" />
              <ReleaseField releases={releases} selected={template.release_id} />
              <div className="actions">
                <SubmitButton label="Save" className="btn primary small" />
              </div>
            </form>
            <form action={deleteTemplate} className="compact-form">
              <input type="hidden" name="id" value={template.id} />
              <input type="hidden" name="next" value="/checklist" />
              <ConfirmSubmit className="btn danger small" label="Stop" message={`Stop “${template.title}” from appearing every day?`} />
            </form>
          </div>
        ))}
      </section>
      <div className="stack">
        {days.map(([date, lines]) => {
          const open = lines.filter((todo) => todo.done === 0).length;
          return (
            <section className="card stack" key={date} id={date === day ? "today" : `day-${date}`}>
              <div className="section-head">
                <div>
                  <p className="kicker">{date === day ? "Today" : prettyDate(date)}</p>
                  <h2>{date === day ? prettyDate(date) : lines.length ? `${lines.length - open} of ${lines.length} done` : "Nothing logged"}</h2>
                </div>
                {date === day ? <span className="meta">{open} open</span> : <span className="meta">{open ? `${open} still open` : "Clear"}</span>}
              </div>
              {lines.length === 0 ? <p className="meta">Nothing on this day yet.</p> : null}
              {lines.map((todo) => (
                <ChecklistLine key={todo.id} todo={todo} next="/checklist" releases={releases} />
              ))}
            </section>
          );
        })}
      </div>
    </>
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
    .map(([date, lines]) => [date, sortLines(lines)] as const);
}

function sortLines(lines: Todo[]) {
  return [...lines].sort((left, right) => {
    if (left.done !== right.done) return left.done - right.done;
    return left.created_at.localeCompare(right.created_at);
  });
}
