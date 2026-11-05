"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteTodo, toggleTodo, updateTodo } from "@/lib/actions";
import { ConfirmSubmit, SubmitButton } from "@/components/controls";
import { Field } from "@/components/ui";
import { clockTime, prettyDate, today } from "@/lib/format";
import type { Todo } from "@/lib/types";

export type ReleaseChoice = { id: string; title: string };

export function ChecklistLine({ todo, next, releases }: { todo: Todo; next: string; releases: ReleaseChoice[] }) {
  const [editing, setEditing] = useState(false);
  const done = todo.done === 1;
  const when = done ? clockTime(todo.completed_at) : "";

  if (editing) {
    return (
      <form action={updateTodo} className="check-edit compact-form">
        <input type="hidden" name="id" value={todo.id} />
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="todo_date" value={todo.todo_date} />
        <input name="title" required defaultValue={todo.title} aria-label="Checklist line" />
        <ReleaseField releases={releases} selected={todo.release_id} />
        <div className="actions">
          <SubmitButton label="Save" className="btn primary small" />
          <button type="button" className="btn small" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={done ? "check-row done-line" : "check-row"}>
      <form action={toggleTodo} className="compact-form">
        <input type="hidden" name="id" value={todo.id} />
        <input type="hidden" name="next" value={next} />
        <button type="submit" className={done ? "tick on" : "tick"} aria-label={done ? `Reopen ${todo.title}` : `Check off ${todo.title}`}>
          {done ? "✓" : ""}
        </button>
      </form>
      <div>
        <strong>{todo.title}</strong>
        {todo.release_id && todo.release_title ? (
          <p className="meta">
            <Link href={`/releases/${todo.release_id}`}>{todo.release_title}</Link>
          </p>
        ) : null}
        {!done && todo.todo_date < today() ? <p className="meta">From {prettyDate(todo.todo_date)}</p> : null}
        {done ? <p className="meta">{when ? `Done ${when}` : "Done"}</p> : null}
      </div>
      <div className="actions">
        <button type="button" className="btn small" onClick={() => setEditing(true)}>
          Edit
        </button>
        <form action={deleteTodo} className="compact-form">
          <input type="hidden" name="id" value={todo.id} />
          <input type="hidden" name="next" value={next} />
          <ConfirmSubmit className="btn danger small" label="Remove" message={`Remove “${todo.title}” from the checklist?`} />
        </form>
      </div>
    </div>
  );
}

export function ReleaseField({ releases, selected = "" }: { releases: ReleaseChoice[]; selected?: string | null }) {
  if (!releases.length) return null;
  return (
    <Field label="Release">
      <select name="release_id" defaultValue={selected ?? ""}>
        <option value="">No release</option>
        {releases.map((release) => (
          <option key={release.id} value={release.id}>
            {release.title}
          </option>
        ))}
      </select>
    </Field>
  );
}
