import { today } from "./format";

export const POST_SLOTS = [
  { time: "05:20", label: "5:20 AM" },
  { time: "12:00", label: "12:00 PM" },
  { time: "18:00", label: "6:00 PM" },
  { time: "19:00", label: "7:00 PM" },
] as const;

const ZONE = "America/New_York";
const CATCH_UP_MS = 30 * 60 * 1000;

export function slotInstant(day: string, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  let guess = Date.parse(`${day}T${pad(hour)}:${pad(minute)}:00Z`);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const found = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const got = Date.parse(`${found.year}-${found.month}-${found.day}T${pad(Number(found.hour) % 24)}:${pad(Number(found.minute))}:00Z`);
    const want = Date.parse(`${day}T${pad(hour)}:${pad(minute)}:00Z`);
    if (got === want) return guess;
    guess += want - got;
  }
  return guess;
}

export function postAlerts(posted: Iterable<string>, now = Date.now()) {
  const day = today();
  const done = new Set(posted);
  return POST_SLOTS.flatMap((slot) => {
    if (done.has(slot.time)) return [];
    const at = slotInstant(day, slot.time);
    if (at <= now && now - at > CATCH_UP_MS) return [];
    return [
      {
        id: `post-${slot.time}`,
        title: "Time to post",
        detail: `${slot.label} Eastern`,
        href: "/#today",
        at,
      },
    ];
  });
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
