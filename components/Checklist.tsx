"use client";

import Link from "next/link";
import { useOptimistic, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteTodo, toggleTodo, updateTodo } from "@/lib/actions";
import { prettyReminder } from "@/lib/checklist";
import { ConfirmSubmit, SubmitButton } from "@/components/controls";
import { Field } from "@/components/ui";
import { clockTime, prettyDate, today } from "@/lib/format";
import type { Todo } from "@/lib/types";

export type ReleaseChoice = { id: string; title: string };

export function ChecklistLine({ todo, next, releases }: { todo: Todo; next: string; releases: ReleaseChoice[] }) {
  const [editing, setEditing] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const done = todo.done === 1;
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  const locked = Number(todo.template_locked) === 1;
  const when = done ? clockTime(todo.completed_at) : "";
  const dayNote = todo.notes?.trim() ?? "";
  const standing = todo.template_notes?.trim() ?? "";
  const reminder = prettyReminder(todo.reminder);
  const status = optimisticDone
    ? when ? `Done ${when} ET` : "Done"
    : todo.todo_date < today()
      ? "Missed"
      : todo.todo_date > today()
        ? "Scheduled"
        : "Open";

  if (editing) {
    return (
      <form action={updateTodo} className="task-edit">
        <input type="hidden" name="id" value={todo.id} />
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="todo_date" value={todo.todo_date} />
        <Field label="Task">
          <input name="title" required defaultValue={todo.title} aria-label="Checklist line" readOnly={locked} />
        </Field>
        <ReleaseField releases={releases} selected={todo.release_id} />
        <Field label="Note">
          <textarea name="notes" defaultValue={todo.notes ?? ""} rows={3} placeholder="Optional note for this day" />
        </Field>
        <Field label="Reminder">
          <input name="reminder" type="time" defaultValue={todo.reminder ?? ""} />
        </Field>
        <div className="actions">
          <SubmitButton label="Save" className="btn primary" />
          <button type="button" className="btn" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className={optimisticDone ? "task done" : "task"}>
      <form
        action={async (formData) => {
          setOptimisticDone(!optimisticDone);
          await toggleTodo(formData);
        }}
      >
        <input type="hidden" name="id" value={todo.id} />
        <input type="hidden" name="next" value={next} />
        <TickButton done={optimisticDone} title={todo.title} />
      </form>
      <div className="task-body">
        <div className="task-line">
          <strong>{todo.title}</strong>
          <span className={optimisticDone ? "task-status good-text" : "task-status"}>{status}</span>
        </div>
        {todo.release_id && todo.release_title ? (
          <p className="meta">
            <Link href={`/releases/${todo.release_id}`}>{todo.release_title}</Link>
          </p>
        ) : null}
        {reminder ? <p className="meta">Reminder {reminder}</p> : null}
        {!optimisticDone && todo.todo_date < today() ? <p className="meta">From {prettyDate(todo.todo_date)}</p> : null}
        {dayNote ? <p className="task-note">{dayNote}</p> : standing ? <p className="task-note">{standing}</p> : null}
        <div className="task-actions">
          <button type="button" className="btn small" onClick={() => setNoteOpen((open) => !open)}>
            {dayNote ? "Edit note" : "Note"}
          </button>
          <button type="button" className="btn small" onClick={() => setEditing(true)}>
            Edit
          </button>
          {todo.template_id ? null : (
            <form action={deleteTodo}>
              <input type="hidden" name="id" value={todo.id} />
              <input type="hidden" name="next" value={next} />
              <ConfirmSubmit className="btn small" label="Remove" message={`Remove “${todo.title}” from this day?`} />
            </form>
          )}
        </div>
        {noteOpen ? (
          <form action={updateTodo} className="task-note-form">
            <input type="hidden" name="id" value={todo.id} />
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="title" value={todo.title} />
            <input type="hidden" name="todo_date" value={todo.todo_date} />
            {todo.release_id ? <input type="hidden" name="release_id" value={todo.release_id} /> : null}
            <textarea name="notes" defaultValue={todo.notes ?? ""} rows={2} placeholder="Note for this day" aria-label={`Note for ${todo.title}`} />
            <SubmitButton label="Save note" className="btn primary small" />
          </form>
        ) : null}
      </div>
    </article>
  );
}

function TickButton({ done, title }: { done: boolean; title: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={done ? "tick on" : "tick"}
      aria-label={done ? `Reopen ${title}` : `Check off ${title}`}
      disabled={pending}
    >
      <span aria-hidden>{done ? "✓" : ""}</span>
    </button>
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
