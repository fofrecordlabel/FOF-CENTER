import { listArtists, listListenerLogs, listLogs, listTodos } from "@/lib/db";
import { today } from "@/lib/format";

export type DeskAlert = {
  id: string;
  title: string;
  detail: string;
  href: string;
};

export async function deskAlerts(): Promise<DeskAlert[]> {
  const day = today();
  const [todos, artists, listenerLogs, logs] = await Promise.all([listTodos(), listArtists(), listListenerLogs(), listLogs()]);
  const alerts: DeskAlert[] = [];
  const open = todos.filter((todo) => todo.done === 0 && todo.todo_date <= day);
  if (open.length) {
    alerts.push({
      id: "checks",
      title: open.length === 1 ? "1 checklist line is open" : `${open.length} checklist lines are open`,
      detail: open.slice(0, 3).map((todo) => todo.title).join(" · "),
      href: "/checklist",
    });
  }
  for (const artist of artists) {
    const logged = listenerLogs.some((log) => log.artist_id === artist.id && log.log_date === day);
    if (!logged) {
      alerts.push({
        id: `listeners-${artist.id}`,
        title: `Log listeners for ${artist.name}`,
        detail: "No number is saved for today.",
        href: "/#listeners",
      });
    }
  }
  for (const post of logs.filter((entry) => entry.status === "planned" && entry.kind === "post" && entry.log_date <= day)) {
    alerts.push({
      id: `post-${post.id}`,
      title: post.log_date < day ? `Overdue post: ${post.title}` : `Post due: ${post.title}`,
      detail: [post.platform, post.artist_name].filter(Boolean).join(" · ") || "Due today",
      href: "/week",
    });
  }
  return alerts;
}
