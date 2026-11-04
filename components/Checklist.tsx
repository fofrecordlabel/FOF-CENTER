"use client";

import { useState } from "react";
import { deleteTodo, toggleTodo, updateTodo } from "@/lib/actions";
import { ConfirmSubmit, SubmitButton } from "@/components/controls";
import { clockTime, prettyDate, today } from "@/lib/format";
import type { Todo } from "@/lib/types";

export function ChecklistLine({ todo, next }: { todo: Todo; next: string }) {
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
