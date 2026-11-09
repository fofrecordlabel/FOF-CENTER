import { DatabaseSync } from "node:sqlite";
import { DEFAULT_TASKS } from "./checklist";
import { today } from "./format";
import type { SqlValue } from "./sql";

const NOW = "2026-11-08T15:00:00.000Z";
const ARTIST = "art_bigdeucefof";

type Song = {
  title: string;
  releaseId: string;
  trackId: string;
  status: string;
  distributor: string | null;
  date: string | null;
  bmi: number;
  publishing: string;
  note: string;
};

const SONGS: Song[] = [
  song("2 Much", "rel_bd_2_much", "trk_bd_2_much", "released", "DistroKid", null, 1, "Sentric Music Songs", "BMI registered 05/11/2025. Work 73118449. ISWC T3325389804. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("4PF", "rel_bd_4pf", "trk_bd_4pf", "taken_down", "DistroKid", null, 1, "Sentric Music Songs", "BMI registered 03/30/2025. Work 72387178. ISWC T3316698912. Alternate title FOUR POCKETS FULL. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Act Upp", "rel_bd_act_upp", "trk_bd_act_upp", "released", "DistroKid", null, 1, "Sentric Music Songs", "BMI registered 03/30/2025. Work 72386985. ISWC T3316699880. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Andale", "rel_bd_andale", "trk_bd_andale", "released", "DistroKid", "2025-05-15", 1, "Sentric Music Songs", "Released May 15, 2025. BMI registered 08/26/2025. Work 74944890. ISWC T3348139099. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Carolina Nigga", "rel_bd_carolina", "trk_bd_carolina", "released", "DistroKid", null, 0, "FOF Music Publishing", "Not in the BMI catalog. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Contraband", "53f104f3-c2f2-47eb-abe7-3db4cedf2854", "eb87ed00-1ac9-43bc-ae5e-f60db46b5c0c", "taken_down", "DistroKid", null, 1, "FOF Music Publishing", "BMI registered 03/30/2025. Work 72387109. ISWC T3316699404. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Da Gang", "rel_bd_da_gang", "trk_bd_da_gang", "taken_down", "DistroKid", null, 1, "FOF Music Publishing", "BMI registered 08/26/2025. Work 74944994. ISWC T3348139486. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Ebola", "rel_bd_ebola", "trk_bd_ebola", "released", "DistroKid", null, 1, "Sentric Music Songs", "BMI registered 03/30/2025. Work 72387007. ISWC T3316699960. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Get Slimed", "rel_bd_get_slimed", "trk_bd_get_slimed", "released", "DistroKid", null, 1, "FOF Music Publishing", "BMI registered 01/14/2026. Work 77297054. ISWC T3379480038. Songview unreconciled. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Givenchy", "rel_bd_givenchy", "trk_bd_givenchy", "taken_down", "DistroKid", null, 1, "FOF Music Publishing", "BMI registered 08/26/2025. Work 74944905. ISWC T3348139179. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Ju And Mel", "rel_bd_ju_and_mel", "trk_bd_ju_and_mel", "released", "DistroKid", null, 1, "Sentric Music Songs", "BMI registered 11/18/2025. Work 76450569. ISWC T3366017434. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Kendrick Perkins", "rel_bd_kendrick", "trk_bd_kendrick", "released", null, null, 1, "Sentric Music Songs", "BMI registered 08/26/2025. Work 74945001. ISWC T3348139180. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Leanade", "rel_bd_leanade", "trk_bd_leanade", "released", null, null, 1, "Sentric Music Songs", "BMI registered 08/26/2025. Work 74944221. ISWC T3348141635. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Mute", "rel_bd_mute", "trk_bd_mute", "released", "DistroKid", null, 1, "Sentric Music Songs", "BMI registered 03/30/2025. Work 72387029. ISWC T3316700893. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("My Mind", "rel_bd_my_mind", "trk_bd_my_mind", "released", null, null, 0, "FOF Music Publishing", "Not in the BMI catalog. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Not Regular", "rel_bd_not_regular", "trk_bd_not_regular", "released", null, null, 1, "Sentric Music Songs", "BMI registered 04/09/2025. Work 72567438. ISWC T3317668701. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Oprah (Freestyle)", "rel_bd_oprah", "trk_bd_oprah", "taken_down", null, "2026-04-03", 1, "Sentric Music Songs", "Released April 3, 2026. BMI registered 10/22/2026. Work 83428569. ISWC T3422281452. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Racks", "rel_bd_racks", "trk_bd_racks", "released", null, null, 1, "Sentric Music Songs", "BMI registered 03/30/2025. Work 72387120. ISWC T3316699562. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Signed a Deal", "rel_bd_signed", "trk_bd_signed", "released", null, null, 1, "Sentric Music Songs", "BMI registered 08/26/2025. Work 74944808. ISWC T3348139715. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Stand on Business", "0d2e0f46-cff3-47a9-aab8-76da3370da2b", "37ea8fa7-2404-485d-a2b3-e58095fa7684", "taken_down", null, null, 1, "FOF Music Publishing", "BMI registered 08/26/2025. Work 74944939. ISWC T3348218695. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Take a Loss", "rel_bd_take_a_loss", "trk_bd_take_a_loss", "taken_down", null, null, 0, "FOF Music Publishing", "Not in the BMI catalog. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Taliban", "rel_bd_taliban", "trk_bd_taliban", "released", null, null, 1, "FOF Music Publishing", "BMI registered 04/09/2025. Work 72567400. ISWC T3317669873. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Wipe Me Down", "rel_bd_wipe", "trk_bd_wipe", "released", null, null, 1, "Sentric Music Songs", "BMI registered 04/09/2025. Work 72567467. ISWC T3317668256. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("WTF", "rel_bd_wtf", "trk_bd_wtf", "released", null, null, 1, "FOF Music Publishing", "BMI registered 02/18/2026. Work 77816038. ISWC T3386374530. Songview unreconciled. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("WWE", "rel_bd_wwe", "trk_bd_wwe", "released", null, null, 1, "Sentric Music Songs", "BMI registered 03/30/2025. Work 72387058. ISWC T3316700315. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Dippp", "rel_bd_dippp", "trk_bd_dippp", "released", null, null, 1, "Sentric Music Songs", "BMI registered 04/09/2025. Work 72567478. ISWC T3317668563. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("John Wick", "rel_bd_john_wick", "trk_bd_john_wick", "released", null, null, 1, "Sentric Music Songs", "BMI registered 04/09/2025. Work 72567341. ISWC T3317669099. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Lowkey", "rel_bd_lowkey", "trk_bd_lowkey", "released", null, null, 1, "Sentric Music Songs", "BMI registered 03/30/2025. Work 72387176. ISWC T3316698934. Writer NOAH MCBRIDE, IPI 01285250159."),
  song("Take It Off", "rel_bd_take_it_off", "trk_bd_take_it_off", "released", null, null, 1, "Sentric Music Songs", "BMI title TAKE IF OFF. Alternate title TAKE IT OFF. BMI registered 04/09/2025. Work 72567448. ISWC T3317619657. Writer NOAH MCBRIDE, IPI 01285250159."),
];

function song(
  title: string,
  releaseId: string,
  trackId: string,
  status: string,
  distributor: string | null,
  date: string | null,
  bmi: number,
  publishing: string,
  note: string
): Song {
  return { title, releaseId, trackId, status, distributor, date, bmi, publishing, note };
}

let held: DatabaseSync | null = null;

function openHeld() {
  if (held) return held;
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE artists (
      id TEXT PRIMARY KEY, stage TEXT, priority TEXT, name TEXT, legal_name TEXT, genre TEXT,
      hometown TEXT, base_city TEXT, bio TEXT, email TEXT, phone TEXT, instagram TEXT, tiktok TEXT,
      spotify_url TEXT, youtube TEXT, website TEXT, monthly_listeners INTEGER, ig_followers INTEGER,
      tiktok_followers INTEGER, image_url TEXT, source TEXT, ar_rep TEXT, ipi TEXT, interest TEXT,
      signed_date TEXT, created_at TEXT, updated_at TEXT
    );
    CREATE TABLE releases (
      id TEXT PRIMARY KEY, artist_id TEXT, title TEXT, release_type TEXT, status TEXT,
      release_date TEXT, upc TEXT, catalog_no TEXT, imprint TEXT, distributor TEXT, cover_url TEXT,
      budget_cents INTEGER, notes TEXT, created_at TEXT
    );
    CREATE TABLE tracks (
      id TEXT PRIMARY KEY, release_id TEXT, artist_id TEXT, title TEXT, isrc TEXT, duration_sec INTEGER,
      track_number INTEGER, explicit INTEGER, writers TEXT, writer_ipis TEXT, producers TEXT,
      master_owner TEXT, publishing TEXT, notes TEXT, bmi INTEGER, mlc INTEGER, soundexchange INTEGER,
      audio_url TEXT, created_at TEXT
    );
    CREATE TABLE listener_logs (
      id TEXT PRIMARY KEY, artist_id TEXT, log_date TEXT, listeners INTEGER, note TEXT, created_at TEXT
    );
    CREATE TABLE activity (
      id TEXT PRIMARY KEY, artist_id TEXT, action TEXT, detail TEXT, created_at TEXT
    );
    CREATE TABLE people (
      id TEXT PRIMARY KEY, name TEXT, role TEXT, company TEXT, email TEXT, phone TEXT, ipi TEXT, notes TEXT, created_at TEXT
    );
    CREATE TABLE artist_people (
      artist_id TEXT, person_id TEXT, relationship TEXT
    );
    CREATE TABLE influencers (
      id TEXT PRIMARY KEY, name TEXT, platform TEXT, handle TEXT, profile_url TEXT, email TEXT, phone TEXT,
      followers INTEGER, city TEXT, niche TEXT, rate TEXT, status TEXT, notes TEXT, kind TEXT, created_at TEXT
    );
    CREATE TABLE contracts (
      id TEXT PRIMARY KEY, artist_id TEXT, title TEXT, deal_type TEXT, status TEXT, territory TEXT,
      term_years INTEGER, options INTEGER, advance_cents INTEGER, royalty_rate REAL, recoupable INTEGER,
      effective_date TEXT, end_date TEXT, notes TEXT, created_at TEXT
    );
    CREATE TABLE checklist_templates (
      id TEXT PRIMARY KEY, title TEXT, release_id TEXT, created_at TEXT, notes TEXT, reminder TEXT,
      archived INTEGER, sort_order INTEGER, locked INTEGER
    );
    CREATE TABLE todos (
      id TEXT PRIMARY KEY, todo_date TEXT, title TEXT, done INTEGER, created_at TEXT, completed_at TEXT,
      release_id TEXT, template_id TEXT, notes TEXT, reminder TEXT
    );
    CREATE TABLE checklist_events (
      id TEXT PRIMARY KEY, todo_id TEXT, template_id TEXT, title TEXT, created_at TEXT
    );
    CREATE TABLE post_checks (
      slot_date TEXT, slot_time TEXT, posted_at TEXT
    );
    CREATE TABLE logs (
      id TEXT PRIMARY KEY, log_date TEXT, kind TEXT, title TEXT, body TEXT, link TEXT, platform TEXT,
      artist_id TEXT, status TEXT, created_at TEXT
    );
    CREATE TABLE splits (
      id TEXT PRIMARY KEY, track_id TEXT, name TEXT, role TEXT, share REAL, ipi TEXT, pro TEXT, created_at TEXT
    );
    CREATE TABLE campaigns (
      id TEXT PRIMARY KEY, release_id TEXT, artist_id TEXT, name TEXT, status TEXT, budget_cents INTEGER, notes TEXT, created_at TEXT
    );
    CREATE TABLE campaign_bookings (
      id TEXT PRIMARY KEY, campaign_id TEXT, influencer_id TEXT, created_at TEXT
    );
    CREATE TABLE takedowns (
      id TEXT PRIMARY KEY, track_id TEXT, store TEXT, taken_down_at TEXT, note TEXT, restored_at TEXT, created_at TEXT
    );
    CREATE TABLE expenses (
      id TEXT PRIMARY KEY, spent_on TEXT, category TEXT, amount_cents INTEGER, payee TEXT, notes TEXT, created_at TEXT
    );
    CREATE TABLE projects (
      id TEXT PRIMARY KEY, artist_id TEXT, release_id TEXT, name TEXT, kind TEXT, status TEXT,
      budget_cents INTEGER, spent_cents INTEGER, start_date TEXT, due_date TEXT, owner TEXT, notes TEXT, created_at TEXT
    );
    CREATE TABLE royalties (
      id TEXT PRIMARY KEY, artist_id TEXT, release_id TEXT, period TEXT, source TEXT, gross_cents INTEGER,
      recoup_cents INTEGER, notes TEXT, created_at TEXT
    );
    CREATE TABLE notes (
      id TEXT PRIMARY KEY, artist_id TEXT, body TEXT, author TEXT, created_at TEXT
    );
    CREATE TABLE files (
      id TEXT PRIMARY KEY, mime TEXT, name TEXT, bytes BLOB, created_at TEXT
    );
    CREATE TABLE file_parts (
      id TEXT, part INTEGER, bytes BLOB, PRIMARY KEY (id, part)
    );
  `);
  db.prepare(
    `INSERT INTO artists (id, stage, priority, name, image_url, monthly_listeners, ipi, created_at, updated_at)
     VALUES (?, 'active', 'high', 'BIGDEUCEFOF', '/brand/bigdeucefof.png', 9539, '01285250159', ?, ?)`
  ).run(ARTIST, NOW, NOW);
  const release = db.prepare(
    `INSERT INTO releases (id, artist_id, title, release_type, status, release_date, imprint, distributor, budget_cents, notes, created_at)
     VALUES (?, ?, ?, 'single', ?, ?, 'FOF Records', ?, 0, ?, ?)`
  );
  const track = db.prepare(
    `INSERT INTO tracks (
      id, release_id, artist_id, title, track_number, explicit, writers, writer_ipis, master_owner, publishing,
      notes, bmi, mlc, soundexchange, created_at
    ) VALUES (?, ?, ?, ?, 1, 1, 'NOAH MCBRIDE', 'NOAH MCBRIDE 01285250159', 'FOF Records', ?, ?, ?, 0, 0, ?)`
  );
  for (const item of SONGS) {
    release.run(item.releaseId, ARTIST, item.title, item.status, item.date, item.distributor, item.note, NOW);
    track.run(item.trackId, item.releaseId, ARTIST, item.title, item.publishing, item.note, item.bmi, NOW);
  }
  const listen = db.prepare("INSERT INTO listener_logs (id, artist_id, log_date, listeners, created_at) VALUES (?, ?, ?, ?, ?)");
  [
    ["ll-1", "2026-11-01", 15000, "2026-11-01T12:00:00.000Z"],
    ["ll-2", "2026-11-04", 10000, "2026-11-04T12:00:00.000Z"],
    ["ll-3", "2026-11-05", 10781, "2026-11-05T12:00:00.000Z"],
    ["ll-4", "2026-11-07", 9648, "2026-11-07T12:00:00.000Z"],
    ["ll-5", "2026-11-07", 9539, "2026-11-07T18:00:00.000Z"],
  ].forEach((row) => listen.run(row[0], ARTIST, row[1], row[2], row[3]));
  db.prepare("INSERT INTO activity (id, artist_id, action, detail, created_at) VALUES (?, ?, 'BMI', ?, ?)").run(
    "act-bmi",
    ARTIST,
    "Matched the BMI catalog. IPI 01285250159 is on BIGDEUCEFOF.",
    NOW
  );
  const day = today();
  const template = db.prepare(
    "INSERT INTO checklist_templates (id, title, created_at, archived, sort_order, locked) VALUES (?, ?, ?, 0, ?, 1)"
  );
  const todo = db.prepare(
    "INSERT INTO todos (id, todo_date, title, done, created_at, template_id) VALUES (?, ?, ?, 0, ?, ?)"
  );
  for (const task of DEFAULT_TASKS) {
    template.run(task.id, task.title, NOW, task.sort_order);
    todo.run(`todo-${task.id}`, day, task.title, NOW, task.id);
  }
  held = db;
  return db;
}

function sqliteStatement(statement: string) {
  return statement.replace(/::(int|integer|text|bigint|float|boolean)/gi, "").replace(/octet_length\s*\(/gi, "length(").replace(/\bILIKE\b/gi, "LIKE");
}

export function runHeld<T>(statement: string, args: SqlValue[] = []): T[] {
  try {
    const rows = openHeld().prepare(sqliteStatement(statement)).all(...(args as never[])) as T[];
    return rows;
  } catch {
    if (/^\s*(select|with)\b/i.test(statement)) return [];
    return [];
  }
}
