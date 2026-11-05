import Link from "next/link";
import { createLog, createTodo, markLogDone } from "@/lib/actions";
import { ChecklistLine, ReleaseChoice, ReleaseField } from "@/components/Checklist";
import { SubmitButton } from "@/components/controls";
import { Field } from "@/components/ui";
import { prettyDate, today } from "@/lib/format";
import { LOG_KINDS, labelFor } from "@/lib/labels";
import type { LogView, Todo } from "@/lib/types";

export function PostNotifications({ posts }: { posts: LogView[] }) {
  const day = today();
  return (
    <section className="card notice">
      <div className="section-head">
        <div>
          <p className="kicker">Post notification</p>
          <h2>{posts.length ? `${posts.length} due` : "Nothing due"}</h2>
        </div>
      </div>
      {posts.length === 0 ? <p className="meta">No post is waiting. Set one for today and it stays on the desk until you mark it posted.</p> : null}
      {posts.map((post) => (
        <div className="master-line" key={post.id}>
          <div>
            <strong>{post.title}</strong>
            <p className="meta">
              {labelFor(LOG_KINDS, post.kind)}
              {" · "}
              {post.log_date < day ? `Overdue ${prettyDate(post.log_date)}` : "Due today"}
              {post.platform ? ` · ${post.platform}` : ""}
              {post.artist_name ? ` · ${post.artist_name}` : ""}
            </p>
          </div>
          <form action={markLogDone}>
            <input type="hidden" name="id" value={post.id} />
            <input type="hidden" name="next" value="/" />
            <SubmitButton label="Mark posted" className="btn primary small" />
          </form>
        </div>
      ))}
      <form action={createLog} className="form-grid">
        <input type="hidden" name="next" value="/" />
        <input type="hidden" name="status" value="planned" />
        <input type="hidden" name="kind" value="post" />
        <input type="hidden" name="log_date" value={day} />
        <Field label="Post to run today" wide>
          <input name="title" required placeholder="Story, reel, playlist pitch" />
        </Field>
        <Field label="Where">
          <input name="platform" placeholder="Instagram, TikTok, Spotify" />
        </Field>
        <div className="actions">
          <SubmitButton label="Set the notification" />
        </div>
      </form>
    </section>
  );
}

export function DailyTodos({ todos, releases }: { todos: Todo[]; releases: ReleaseChoice[] }) {
  const day = today();
  const open = todos.filter((todo) => todo.done === 0);
  const done = todos.filter((todo) => todo.done === 1 && todo.todo_date === day);
  const lines = [...open, ...done];
  return (
    <section className="card stack">
      <div className="section-head">
        <div>
          <p className="kicker">Today</p>
          <h2>Checklist</h2>
        </div>
        <Link href="/checklist" className="meta">
          All days
        </Link>
      </div>
      {lines.length === 0 ? <p className="meta">The list is clear.</p> : null}
      {lines.map((todo) => (
        <ChecklistLine key={todo.id} todo={todo} next="/" releases={releases} />
      ))}
      <form action={createTodo} className="form-grid compact-form">
        <input type="hidden" name="next" value="/" />
        <input type="hidden" name="todo_date" value={day} />
        <Field label="Add a line" wide>
          <input name="title" required placeholder="Send the cover, call the plug, book the post" enterKeyHint="done" />
        </Field>
        <ReleaseField releases={releases} />
        <label className="check wide">
          <input type="checkbox" name="repeat" value="1" />
          <span>Every day</span>
        </label>
        <div className="actions wide">
          <SubmitButton label="Add to today" />
        </div>
      </form>
    </section>
  );
}
