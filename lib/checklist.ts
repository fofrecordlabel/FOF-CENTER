import type { Todo } from "./types";

export const DEFAULT_TASKS = [
  { id: "tpl_post_tiktok", title: "Post on TikTok", sort_order: 1 },
  { id: "tpl_post_instagram", title: "Post on Instagram", sort_order: 2 },
  { id: "tpl_spotify_sauce", title: "Spotify sauce", sort_order: 3 },
  { id: "tpl_instagram_ads", title: "Run Instagram ads", sort_order: 4 },
  { id: "tpl_tiktok_promotion", title: "TikTok promotion", sort_order: 5 },
  { id: "tpl_write_blog", title: "Write a blog", sort_order: 6 },
  { id: "tpl_find_influencers", title: "Find new influencers", sort_order: 7 },
] as const;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type DayStats = { done: number; total: number; percent: number; missed: number };
export type SpanStats = { done: number; total: number; percent: number | null };

export type ChecklistStats = {
  today: DayStats;
  weekCompleted: number;
  weekTotal: number;
  monthCompleted: number;
  monthTotal: number;
  streak: number;
  best: { date: string; percent: number; done: number; total: number } | null;
  bestWeekday: { name: string; percent: number } | null;
  weeks: Array<SpanStats & { from: string; to: string }>;
  months: Array<SpanStats & { month: string }>;
};

export function reminderMinutes(value: string | null | undefined) {
  if (!value) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function prettyReminder(value: string | null | undefined) {
  if (reminderMinutes(value) == null || !value) return "";
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date(Date.UTC(2026, 0, 1, hour, minute));
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

export function isDay(value: string | undefined | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isMonth(value: string | undefined | null): value is string {
  return !!value && /^\d{4}-\d{2}$/.test(value);
}

export function shiftDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return utcDay(date);
}

export function weekStart(day: string) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return utcDay(date);
}

export function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthCells(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells: Array<string | null> = [];
  for (let index = 0; index < first.getUTCDay(); index += 1) cells.push(null);
  for (let dayNumber = 1; dayNumber <= count; dayNumber += 1) {
    cells.push(`${year}-${String(monthNumber).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`);
  }
  return cells;
}

export function dayStats(lines: Array<{ done: number }>): DayStats {
  const total = lines.length;
  const done = lines.filter((line) => line.done === 1).length;
  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
    missed: Math.max(0, total - done),
  };
}

export function checklistStats(todos: Todo[], day: string): ChecklistStats {
  const byDate = groupTodos(todos);
  const today = dayStats(byDate.get(day) ?? []);
  const weekFrom = weekStart(day);
  const month = day.slice(0, 7);
  const weekLines = todos.filter((todo) => todo.todo_date >= weekFrom && todo.todo_date <= addWeekEnd(weekFrom) && todo.todo_date <= day);
  const monthLines = todos.filter((todo) => todo.todo_date.startsWith(month) && todo.todo_date <= day);
  const week = dayStats(weekLines);
  const monthStats = dayStats(monthLines);
  return {
    today,
    weekCompleted: week.done,
    weekTotal: week.total,
    monthCompleted: monthStats.done,
    monthTotal: monthStats.total,
    streak: streakEnding(byDate, day),
    best: bestDay(byDate),
    bestWeekday: bestWeekday(byDate),
    weeks: lastWeeks(byDate, day, 8),
    months: lastMonths(byDate, day, 6),
  };
}

export function sortTasks(lines: Todo[]) {
  return [...lines].sort((left, right) => {
    const order = (left.template_sort ?? 1000) - (right.template_sort ?? 1000);
    if (order) return order;
    return left.created_at.localeCompare(right.created_at);
  });
}

function addWeekEnd(start: string) {
  return shiftDay(start, 6);
}

function groupTodos(todos: Todo[]) {
  const byDate = new Map<string, Todo[]>();
  for (const todo of todos) {
    const lines = byDate.get(todo.todo_date) ?? [];
    lines.push(todo);
    byDate.set(todo.todo_date, lines);
  }
  return byDate;
}

function streakEnding(byDate: Map<string, Todo[]>, day: string) {
  let cursor = complete(byDate.get(day)) ? day : shiftDay(day, -1);
  let count = 0;
  for (let index = 0; index < 400; index += 1) {
    if (!complete(byDate.get(cursor))) break;
    count += 1;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}

function complete(lines: Todo[] | undefined) {
  return !!lines?.length && lines.every((line) => line.done === 1);
}

function bestDay(byDate: Map<string, Todo[]>) {
  let best: ChecklistStats["best"] = null;
  for (const [date, lines] of byDate) {
    const stats = dayStats(lines);
    if (!stats.done) continue;
    if (
      !best ||
      stats.percent > best.percent ||
      (stats.percent === best.percent && stats.done > best.done) ||
      (stats.percent === best.percent && stats.done === best.done && date > best.date)
    ) {
      best = { date, percent: stats.percent, done: stats.done, total: stats.total };
    }
  }
  return best;
}

function bestWeekday(byDate: Map<string, Todo[]>) {
  const buckets = WEEKDAYS.map(() => ({ done: 0, total: 0 }));
  for (const [date, lines] of byDate) {
    if (!lines.length) continue;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const stats = dayStats(lines);
    buckets[weekday].done += stats.done;
    buckets[weekday].total += stats.total;
  }
  let best: { name: string; percent: number } | null = null;
  buckets.forEach((bucket, index) => {
    if (!bucket.total || !bucket.done) return;
    const percent = Math.round((bucket.done / bucket.total) * 100);
    if (!best || percent > best.percent) best = { name: WEEKDAYS[index], percent };
  });
  return best;
}

function lastWeeks(byDate: Map<string, Todo[]>, day: string, count: number) {
  const current = weekStart(day);
  const weeks: ChecklistStats["weeks"] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const from = shiftDay(current, -7 * index);
    const to = shiftDay(from, 6);
    const lines: Todo[] = [];
    for (const [date, tasks] of byDate) {
      if (date >= from && date <= to && date <= day) lines.push(...tasks);
    }
    weeks.push({ from, to, ...span(lines) });
  }
  return weeks;
}

function lastMonths(byDate: Map<string, Todo[]>, day: string, count: number) {
  const current = day.slice(0, 7);
  const months: ChecklistStats["months"] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const month = shiftMonth(current, -index);
    const lines: Todo[] = [];
    for (const [date, tasks] of byDate) {
      if (date.startsWith(month) && date <= day) lines.push(...tasks);
    }
    months.push({ month, ...span(lines) });
  }
  return months;
}

function span(lines: Todo[]): SpanStats {
  if (!lines.length) return { done: 0, total: 0, percent: null };
  const stats = dayStats(lines);
  return { done: stats.done, total: stats.total, percent: stats.percent };
}

function utcDay(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}
