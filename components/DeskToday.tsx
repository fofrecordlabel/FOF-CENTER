import Link from "next/link";
import { createLog, createTodo, markLogDone, markPostSlot } from "@/lib/actions";
import { ChecklistLine, ReleaseChoice, ReleaseField } from "@/components/Checklist";
import { SubmitButton } from "@/components/controls";
import { Field, ProgressMeter } from "@/components/ui";
import { dayStats, reminderMinutes, sortTasks } from "@/lib/checklist";
import { deskMinutes, prettyDate, today } from "@/lib/format";
import { POST_SLOTS } from "@/lib/posts";
import { LOG_KINDS, labelFor } from "@/lib/labels";
import type { LogView, Todo } from "@/lib/types";

export function PostNotifications({ posts, posted = [] }: { posts: LogView[]; posted?: string[] }) {
  const day = today();
  const minute = deskMinutes();
  const done = new Set(posted);
  const openSlots = POST_SLOTS.filter((slot) => !done.has(slot.time) && (reminderMinutes(slot.time) ?? 0) <= minute).length;
  return (
    <section className="card notice">
      <div className="section-head">
        <div>
          <p className="kicker">Post notification</p>
          <h2>{openSlots ? `${openSlots} due` : posts.length ? `${posts.length} due` : "On schedule"}</h2>
        </div>
      </div>
      <p className="meta">Alerts at 5:20 AM, 12:00 PM, 6:00 PM, and 7:00 PM Eastern.</p>
      <div className="task-list">
        {POST_SLOTS.map((slot) => {
          const postedSlot = done.has(slot.time);
          const due = (reminderMinutes(slot.time) ?? 0) <= minute;
          return (
            <div className={postedSlot ? "post-slot done" : "post-slot"} key={slot.time}>
              <div>
                <strong>{slot.label}</strong>
                <p className={postedSlot ? "meta good-text" : "meta"}>{postedSlot ? "Posted" : due ? "Post now" : "Upcoming"}</p>
              </div>
              {postedSlot || !due ? null : (
                <form action={markPostSlot}>
                  <input type="hidden" name="next" value="/" />
                  <input type="hidden" name="slot_time" value={slot.time} />
                  <SubmitButton label="Posted" className="btn primary small" />
                </form>
              )}
            </div>
          );
        })}
      </div>
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
  const lines = sortTasks(todos.filter((todo) => todo.todo_date === day));
  const earlier = todos.filter((todo) => todo.done === 0 && todo.todo_date < day).length;
  const stats = dayStats(lines);
  return (
    <section className="card stack" id="checklist">
      <div className="section-head">
        <div>
          <p className="kicker">Today</p>
          <h2>Checklist</h2>
        </div>
        <Link href="/checklist" className="meta">
          All days
        </Link>
      </div>
      <ProgressMeter done={stats.done} total={stats.total} />
      {lines.length === 0 ? <p className="meta">Today’s list appears here as soon as the desk opens.</p> : null}
      {lines.map((todo) => (
        <ChecklistLine key={todo.id} todo={todo} next="/" releases={releases} />
      ))}
      {earlier ? (
        <p className="meta">
          <Link href="/checklist">{earlier} still open from earlier days</Link>
        </p>
      ) : null}
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
