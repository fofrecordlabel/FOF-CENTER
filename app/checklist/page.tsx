import Link from "next/link";
import { createTodo } from "@/lib/actions";
import { ChecklistLine } from "@/components/Checklist";
import { SubmitButton } from "@/components/controls";
import { Banner, Field, PageHeader } from "@/components/ui";
import { listTodos } from "@/lib/db";
import { prettyDate, today } from "@/lib/format";
import type { Todo } from "@/lib/types";

export const metadata = { title: "Checklist" };

export default async function ChecklistPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const day = today();
  const todos = await listTodos();
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
          <div className="actions wide">
            <SubmitButton label="Add to the checklist" />
          </div>
        </form>
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
                <ChecklistLine key={todo.id} todo={todo} next="/checklist" />
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
