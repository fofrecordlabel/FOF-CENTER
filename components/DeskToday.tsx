import { createLog, createTodo, deleteTodo, markLogDone, toggleTodo } from "@/lib/actions";
import { PostAlert } from "@/components/PostAlert";
import { ConfirmSubmit, SubmitButton } from "@/components/controls";
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
        <PostAlert titles={posts.map((post) => post.title)} />
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

export function DailyTodos({ todos }: { todos: Todo[] }) {
  const day = today();
  const open = todos.filter((todo) => todo.done === 0);
  const done = todos.filter((todo) => todo.done === 1 && todo.todo_date === day);
  return (
    <section className="card stack">
      <div className="section-head">
        <div>
          <p className="kicker">Today</p>
          <h2>To-do</h2>
        </div>
        <span className="meta">{open.length} open</span>
      </div>
      <form action={createTodo} className="form-grid">
        <input type="hidden" name="next" value="/" />
        <input type="hidden" name="todo_date" value={day} />
        <Field label="Add a line" wide>
          <input name="title" required placeholder="Send the cover, call the plug, book the post" />
        </Field>
        <div className="actions wide">
          <SubmitButton label="Add to today" />
        </div>
      </form>
      {open.length === 0 && done.length === 0 ? <p className="meta">The list is clear.</p> : null}
      {open.map((todo) => (
        <div className="master-line" key={todo.id}>
          <div>
            <strong>{todo.title}</strong>
            {todo.todo_date < day ? <p className="meta">From {prettyDate(todo.todo_date)}</p> : null}
          </div>
          <div className="actions">
            <form action={toggleTodo}>
              <input type="hidden" name="id" value={todo.id} />
              <input type="hidden" name="next" value="/" />
              <SubmitButton label="Done" className="btn primary small" />
            </form>
            <form action={deleteTodo}>
              <input type="hidden" name="id" value={todo.id} />
              <input type="hidden" name="next" value="/" />
              <ConfirmSubmit className="btn danger small" label="Remove" message={`Remove “${todo.title}” from today?`} />
            </form>
          </div>
        </div>
      ))}
      {done.map((todo) => (
        <div className="master-line done-line" key={todo.id}>
          <div>
            <strong>{todo.title}</strong>
            <p className="meta">Done</p>
          </div>
          <form action={toggleTodo}>
            <input type="hidden" name="id" value={todo.id} />
            <input type="hidden" name="next" value="/" />
            <SubmitButton label="Reopen" className="btn small" />
          </form>
        </div>
      ))}
    </section>
  );
}
