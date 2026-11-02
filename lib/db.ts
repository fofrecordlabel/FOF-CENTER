import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { isRoster, labelFor, PIPELINE_STAGES, ROSTER_STAGES, STAGES } from "./labels";
import { SEED_ARTIST_IDS, SEED_PERSON_IDS } from "./seed";
import { insert, removeRow, transaction, uid, updateRow, type SqlValue } from "./sql";
import type {
  Activity,
  ActivityView,
  Artist,
  Contract,
  ContractView,
  Dossier,
  MoneySnapshot,
  Influencer,
  Campaign,
  CampaignBooking,
  ListenerLog,
  LogView,
  Split,
  Note,
  Person,
  PersonView,
  Project,
  ProjectView,
  Release,
  ReleaseView,
  Royalty,
  RoyaltyView,
  Track,
  TrackView,
} from "./types";

const globalForDb = globalThis as unknown as { fofDb?: DatabaseSync };

export function getDb() {
  if (!globalForDb.fofDb) {
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const db = new DatabaseSync(path.join(dir, "fof.db"));
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA busy_timeout = 5000");
    globalForDb.fofDb = db;
  }
  migrate(globalForDb.fofDb);
  ensureLiveDesk(globalForDb.fofDb);
  return globalForDb.fofDb;
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      name TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artists (
      id TEXT PRIMARY KEY,
      stage TEXT NOT NULL,
      priority TEXT NOT NULL,
      name TEXT NOT NULL,
      legal_name TEXT,
      genre TEXT,
      hometown TEXT,
      base_city TEXT,
      bio TEXT,
      email TEXT,
      phone TEXT,
      instagram TEXT,
      tiktok TEXT,
      spotify_url TEXT,
      youtube TEXT,
      website TEXT,
      monthly_listeners INTEGER,
      ig_followers INTEGER,
      tiktok_followers INTEGER,
      image_url TEXT,
      source TEXT,
      ar_rep TEXT,
      interest TEXT,
      signed_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      company TEXT,
      email TEXT,
      phone TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artist_people (
      artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      relationship TEXT,
      PRIMARY KEY (artist_id, person_id)
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      deal_type TEXT NOT NULL,
      status TEXT NOT NULL,
      territory TEXT,
      term_years REAL,
      options INTEGER,
      advance_cents INTEGER NOT NULL DEFAULT 0,
      royalty_rate REAL,
      recoupable INTEGER NOT NULL DEFAULT 1,
      effective_date TEXT,
      end_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS releases (
      id TEXT PRIMARY KEY,
      artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      release_type TEXT NOT NULL,
      status TEXT NOT NULL,
      release_date TEXT,
      upc TEXT,
      catalog_no TEXT,
      imprint TEXT,
      distributor TEXT,
      cover_url TEXT,
      budget_cents INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      release_id TEXT REFERENCES releases(id) ON DELETE CASCADE,
      artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      isrc TEXT,
      duration_sec INTEGER,
      track_number INTEGER,
      explicit INTEGER NOT NULL DEFAULT 0,
      writers TEXT,
      producers TEXT,
      master_owner TEXT,
      publishing TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      artist_id TEXT REFERENCES artists(id) ON DELETE CASCADE,
      release_id TEXT REFERENCES releases(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      budget_cents INTEGER NOT NULL DEFAULT 0,
      spent_cents INTEGER NOT NULL DEFAULT 0,
      start_date TEXT,
      due_date TEXT,
      owner TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS royalties (
      id TEXT PRIMARY KEY,
      artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      release_id TEXT REFERENCES releases(id) ON DELETE SET NULL,
      period TEXT NOT NULL,
      source TEXT NOT NULL,
      gross_cents INTEGER NOT NULL DEFAULT 0,
      recoup_cents INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      author TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      artist_id TEXT REFERENCES artists(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_contracts_artist ON contracts(artist_id);
    CREATE INDEX IF NOT EXISTS idx_releases_artist ON releases(artist_id);
    CREATE INDEX IF NOT EXISTS idx_tracks_release ON tracks(release_id);
    CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id);
    CREATE INDEX IF NOT EXISTS idx_projects_artist ON projects(artist_id);
    CREATE INDEX IF NOT EXISTS idx_royalties_artist ON royalties(artist_id);
    CREATE INDEX IF NOT EXISTS idx_notes_artist ON notes(artist_id);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at);

    CREATE TABLE IF NOT EXISTS influencers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      handle TEXT,
      profile_url TEXT,
      email TEXT,
      phone TEXT,
      followers INTEGER,
      city TEXT,
      niche TEXT,
      rate TEXT,
      status TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      log_date TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      link TEXT,
      platform TEXT,
      artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(log_date);

    CREATE TABLE IF NOT EXISTS listener_logs (
      id TEXT PRIMARY KEY,
      artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      log_date TEXT NOT NULL,
      listeners INTEGER NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_listener_logs_artist ON listener_logs(artist_id, log_date);

    CREATE TABLE IF NOT EXISTS splits (
      id TEXT PRIMARY KEY,
      track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      share REAL,
      ipi TEXT,
      pro TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
      artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      budget_cents INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaign_bookings (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      influencer_id TEXT REFERENCES influencers(id) ON DELETE SET NULL,
      paid TEXT,
      posted INTEGER NOT NULL DEFAULT 0,
      post_url TEXT,
      created_at TEXT NOT NULL
    );
  `);
  addColumn(db, "artists", "ipi", "TEXT");
  addColumn(db, "people", "ipi", "TEXT");
  addColumn(db, "tracks", "writer_ipis", "TEXT");
  addColumn(db, "logs", "status", "TEXT NOT NULL DEFAULT 'done'");
}

function addColumn(db: DatabaseSync, table: string, column: string, type: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

const LIVE_DESK = "live-1";

function ensureLiveDesk(db: DatabaseSync) {
  const row = db.prepare("SELECT value FROM meta WHERE name = 'desk_version'").get() as { value: string } | undefined;
  if (row?.value === LIVE_DESK) return;
  db.exec("PRAGMA foreign_keys = OFF");
  try {
  transaction(db, () => {
    db.exec(`
      DELETE FROM activity;
      DELETE FROM campaign_bookings;
      DELETE FROM campaigns;
      DELETE FROM splits;
      DELETE FROM listener_logs;
      DELETE FROM logs;
      DELETE FROM notes;
      DELETE FROM royalties;
      DELETE FROM projects;
      DELETE FROM tracks;
      DELETE FROM releases;
      DELETE FROM contracts;
      DELETE FROM artist_people;
      DELETE FROM people;
      DELETE FROM artists;
      DELETE FROM influencers;
    `);
    const now = new Date().toISOString();
    insert(db, "artists", {
      id: "art_bigdeucefof",
      stage: "active",
      priority: "high",
      name: "BIGDEUCEFOF",
      created_at: now,
      updated_at: now,
    });
    insert(db, "activity", {
      id: "act_bigdeucefof",
      artist_id: "art_bigdeucefof",
      action: "File",
      detail: "BIGDEUCEFOF is the only artist on the desk.",
      created_at: now,
    });
    db.prepare(
      `INSERT INTO meta (name, value) VALUES ('desk_version', ?)
       ON CONFLICT(name) DO UPDATE SET value = excluded.value`
    ).run(LIVE_DESK);
    db.prepare(
      `INSERT INTO meta (name, value) VALUES ('initialized', '1')
       ON CONFLICT(name) DO UPDATE SET value = excluded.value`
    ).run();
  });
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
}

function one<T>(sql: string, ...args: SqlValue[]): T | null {
  const row = getDb().prepare(sql).get(...args);
  return (row as T) ?? null;
}

function many<T>(sql: string, ...args: SqlValue[]): T[] {
  return getDb().prepare(sql).all(...args) as T[];
}

export function writeRow(table: string, id: string | null, fields: Record<string, SqlValue>) {
  const db = getDb();
  if (id) {
    updateRow(db, table, id, fields);
    return id;
  }
  const newId = uid();
  insert(db, table, { ...fields, id: newId });
  return newId;
}

export function destroy(table: string, id: string) {
  removeRow(getDb(), table, id);
}

export function touchArtist(id: string) {
  getDb().prepare("UPDATE artists SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
}

export function logActivity(artistId: string | null, action: string, detail: string) {
  insert(getDb(), "activity", {
    id: uid(),
    artist_id: artistId,
    action,
    detail,
    created_at: new Date().toISOString(),
  });
}

export function listArtists() {
  return many<Artist>(
    `SELECT * FROM artists
     ORDER BY CASE priority WHEN 'rush' THEN 0 WHEN 'high' THEN 1 WHEN 'standard' THEN 2 ELSE 3 END,
              name COLLATE NOCASE`
  );
}

export function getArtist(id: string) {
  return one<Artist>("SELECT * FROM artists WHERE id = ?", id);
}

export function artistsIn(stages: string[]) {
  const all = listArtists();
  return all.filter((artist) => stages.includes(artist.stage));
}

export function listPeople(): PersonView[] {
  const people = many<Person>("SELECT * FROM people ORDER BY name COLLATE NOCASE");
  const links = many<{ person_id: string; relationship: string | null; artist_id: string; artist_name: string }>(
    `SELECT ap.person_id, ap.relationship, a.id AS artist_id, a.name AS artist_name
     FROM artist_people ap JOIN artists a ON a.id = ap.artist_id
     ORDER BY a.name COLLATE NOCASE`
  );
  return people.map((person) => ({
    ...person,
    artists: links
      .filter((link) => link.person_id === person.id)
      .map((link) => ({ id: link.artist_id, name: link.artist_name, relationship: link.relationship })),
  }));
}

export function getPerson(id: string) {
  return one<Person>("SELECT * FROM people WHERE id = ?", id);
}

export function listInfluencers() {
  return many<Influencer>("SELECT * FROM influencers ORDER BY name COLLATE NOCASE");
}

export function listLogs() {
  return many<LogView>(
    `SELECT logs.*, artists.name AS artist_name
     FROM logs
     LEFT JOIN artists ON artists.id = logs.artist_id
     ORDER BY logs.log_date DESC, logs.created_at DESC`
  );
}

export function listListenerLogs(artistId?: string) {
  if (artistId) {
    return many<ListenerLog>(
      "SELECT * FROM listener_logs WHERE artist_id = ? ORDER BY log_date ASC, created_at ASC",
      artistId
    );
  }
  return many<ListenerLog>("SELECT * FROM listener_logs ORDER BY log_date ASC, created_at ASC");
}

export function getListenerLog(id: string) {
  return one<ListenerLog>("SELECT * FROM listener_logs WHERE id = ?", id);
}

export function listSplits() {
  return many<Split>("SELECT * FROM splits ORDER BY created_at ASC");
}

export function getSplit(id: string) {
  return one<Split>("SELECT * FROM splits WHERE id = ?", id);
}

export function listCampaigns() {
  return many<Campaign>("SELECT * FROM campaigns ORDER BY created_at DESC");
}

export function getCampaign(id: string) {
  return one<Campaign>("SELECT * FROM campaigns WHERE id = ?", id);
}

export function listBookings() {
  return many<CampaignBooking>(
    `SELECT campaign_bookings.*, influencers.name AS influencer_name, influencers.handle AS handle
     FROM campaign_bookings
     LEFT JOIN influencers ON influencers.id = campaign_bookings.influencer_id
     ORDER BY campaign_bookings.created_at ASC`
  );
}

export function getBooking(id: string) {
  return one<CampaignBooking>(
    `SELECT campaign_bookings.*, influencers.name AS influencer_name, influencers.handle AS handle
     FROM campaign_bookings
     LEFT JOIN influencers ON influencers.id = campaign_bookings.influencer_id
     WHERE campaign_bookings.id = ?`,
    id
  );
}

export function syncListeners(artistId: string) {
  const latest = one<{ listeners: number }>(
    "SELECT listeners FROM listener_logs WHERE artist_id = ? ORDER BY log_date DESC, created_at DESC LIMIT 1",
    artistId
  );
  const now = new Date().toISOString();
  if (latest) {
    getDb().prepare("UPDATE artists SET monthly_listeners = ?, updated_at = ? WHERE id = ?").run(latest.listeners, now, artistId);
  } else {
    getDb().prepare("UPDATE artists SET monthly_listeners = NULL, updated_at = ? WHERE id = ?").run(now, artistId);
  }
}

export function getLog(id: string) {
  return one<LogView>(
    `SELECT logs.*, artists.name AS artist_name
     FROM logs
     LEFT JOIN artists ON artists.id = logs.artist_id
     WHERE logs.id = ?`,
    id
  );
}

export function getInfluencer(id: string) {
  return one<Influencer>("SELECT * FROM influencers WHERE id = ?", id);
}

export function linkPerson(artistId: string, personId: string, relationship: string | null) {
  getDb()
    .prepare(
      `INSERT INTO artist_people (artist_id, person_id, relationship)
       VALUES (?, ?, ?)
       ON CONFLICT(artist_id, person_id) DO UPDATE SET relationship = excluded.relationship`
    )
    .run(artistId, personId, relationship);
}

export function unlinkPerson(artistId: string, personId: string) {
  getDb().prepare("DELETE FROM artist_people WHERE artist_id = ? AND person_id = ?").run(artistId, personId);
}

export function listContracts(artistId?: string) {
  if (artistId) return many<Contract>("SELECT * FROM contracts WHERE artist_id = ? ORDER BY created_at DESC", artistId);
  return many<Contract>("SELECT * FROM contracts ORDER BY created_at DESC");
}

export function listContractViews() {
  return many<ContractView>(
    `SELECT contracts.*, artists.name AS artist_name
     FROM contracts JOIN artists ON artists.id = contracts.artist_id
     ORDER BY contracts.created_at DESC`
  );
}

export function getContract(id: string) {
  return one<Contract>("SELECT * FROM contracts WHERE id = ?", id);
}

export function listReleaseViews() {
  return many<ReleaseView>(
    `SELECT releases.*, artists.name AS artist_name
     FROM releases JOIN artists ON artists.id = releases.artist_id
     ORDER BY CASE WHEN releases.release_date IS NULL THEN 1 ELSE 0 END, releases.release_date ASC`
  );
}

export function getRelease(id: string) {
  return one<ReleaseView>(
    `SELECT releases.*, artists.name AS artist_name
     FROM releases JOIN artists ON artists.id = releases.artist_id
     WHERE releases.id = ?`,
    id
  );
}

export function listTracksForRelease(releaseId: string) {
  return many<Track>("SELECT * FROM tracks WHERE release_id = ? ORDER BY track_number, title COLLATE NOCASE", releaseId);
}

export function listTrackViews() {
  return many<TrackView>(
    `SELECT tracks.*, artists.name AS artist_name, releases.title AS release_title
     FROM tracks
     JOIN artists ON artists.id = tracks.artist_id
     LEFT JOIN releases ON releases.id = tracks.release_id
     ORDER BY artists.name COLLATE NOCASE, releases.title, tracks.track_number`
  );
}

export function getTrack(id: string) {
  return one<Track>("SELECT * FROM tracks WHERE id = ?", id);
}

export function listProjectViews() {
  return many<ProjectView>(
    `SELECT projects.*, artists.name AS artist_name, releases.title AS release_title
     FROM projects
     LEFT JOIN artists ON artists.id = projects.artist_id
     LEFT JOIN releases ON releases.id = projects.release_id
     ORDER BY CASE WHEN projects.due_date IS NULL THEN 1 ELSE 0 END, projects.due_date ASC`
  );
}

export function getProject(id: string) {
  return one<Project>("SELECT * FROM projects WHERE id = ?", id);
}

export function listRoyaltyViews() {
  return many<RoyaltyView>(
    `SELECT royalties.*, artists.name AS artist_name, releases.title AS release_title
     FROM royalties
     JOIN artists ON artists.id = royalties.artist_id
     LEFT JOIN releases ON releases.id = royalties.release_id
     ORDER BY royalties.created_at DESC`
  );
}

export function getRoyalty(id: string) {
  return one<Royalty>("SELECT * FROM royalties WHERE id = ?", id);
}

export function getNote(id: string) {
  return one<Note>("SELECT * FROM notes WHERE id = ?", id);
}

export function moneySnapshot(artistId: string): MoneySnapshot {
  const contracts = listContracts(artistId).filter((contract) => contract.status === "executed" && contract.recoupable === 1);
  const advance = contracts.reduce((sum, contract) => sum + contract.advance_cents, 0);
  const sums = one<{ recouped: number; gross: number }>(
    "SELECT COALESCE(SUM(recoup_cents), 0) AS recouped, COALESCE(SUM(gross_cents), 0) AS gross FROM royalties WHERE artist_id = ?",
    artistId
  );
  const recouped = sums?.recouped ?? 0;
  const gross = sums?.gross ?? 0;
  return { advance, recouped, gross, balance: advance - recouped };
}

export function primaryDeal(artistId: string) {
  const deals = listContracts(artistId);
  return deals.find((deal) => deal.status === "executed") ?? deals[0] ?? null;
}

export function getDossier(id: string): Dossier | null {
  const artist = getArtist(id);
  if (!artist) return null;
  const people = listPeople();
  const linked = people
    .filter((person) => person.artists.some((link) => link.id === id))
    .map((person) => ({
      ...person,
      relationship: person.artists.find((link) => link.id === id)?.relationship ?? null,
    }));
  const releases = many<Release>("SELECT * FROM releases WHERE artist_id = ? ORDER BY release_date IS NULL, release_date DESC, title", id).map(
    (release) => ({ ...release, tracks: listTracksForRelease(release.id) })
  );
  return {
    artist,
    people: linked,
    directory: people
      .filter((person) => !person.artists.some((link) => link.id === id))
      .map((person) => ({ id: person.id, name: person.name, role: person.role, company: person.company })),
    contracts: listContracts(id),
    releases,
    projects: many<Project>("SELECT * FROM projects WHERE artist_id = ? ORDER BY due_date IS NULL, due_date", id),
    royalties: many<Royalty>("SELECT * FROM royalties WHERE artist_id = ? ORDER BY created_at DESC", id),
    notes: many<Note>("SELECT * FROM notes WHERE artist_id = ? ORDER BY created_at DESC", id),
    activity: many<Activity>("SELECT * FROM activity WHERE artist_id = ? ORDER BY created_at DESC LIMIT 30", id),
    money: moneySnapshot(id),
    releaseOptions: releases.map((release) => ({ id: release.id, title: release.title })),
  };
}

export function rosterRows() {
  return artistsIn(ROSTER_STAGES.map((stage) => stage.value))
    .map((artist) => ({ artist, deal: primaryDeal(artist.id), ...moneySnapshot(artist.id) }))
    .sort((a, b) => a.artist.name.localeCompare(b.artist.name));
}

export function hotArtists() {
  const rank: Record<string, number> = { rush: 0, high: 1, standard: 2, low: 3 };
  return listArtists()
    .filter((artist) => {
      const inPipeline = PIPELINE_STAGES.some((stage) => stage.value === artist.stage);
      if (!inPipeline) return false;
      return artist.priority === "rush" || artist.priority === "high" || artist.stage === "offer" || artist.stage === "legal";
    })
    .sort((a, b) => (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9) || a.name.localeCompare(b.name));
}

export function dueProjects() {
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
  return listProjectViews().filter(
    (project) =>
      project.due_date &&
      (project.status === "planned" || project.status === "active") &&
      project.due_date <= soon &&
      project.due_date >= "2000-01-01" &&
      (project.due_date <= soon)
  ).map((project) => ({ ...project, overdue: Boolean(project.due_date && project.due_date < today) }));
}

export function comingReleases() {
  return listReleaseViews().filter((release) => ["scheduled", "production", "delivered"].includes(release.status));
}

export function recentActivity() {
  return many<ActivityView>(
    `SELECT activity.*, artists.name AS artist_name
     FROM activity LEFT JOIN artists ON artists.id = activity.artist_id
     ORDER BY activity.created_at DESC LIMIT 10`
  );
}

export function dashboard() {
  const artists = listArtists();
  const roster = artists.filter((artist) => isRoster(artist.stage));
  const pipeline = artists.filter((artist) => PIPELINE_STAGES.some((stage) => stage.value === artist.stage));
  const offers = artists.filter((artist) => artist.stage === "offer" || artist.stage === "legal");
  const snaps = roster.map((artist) => ({ artist, ...moneySnapshot(artist.id) }));
  const unrecouped = snaps.reduce((sum, row) => sum + Math.max(0, row.balance), 0);
  const payable = snaps.reduce((sum, row) => sum + Math.max(0, -row.balance), 0);
  const stageCounts = STAGES.map((stage) => ({
    ...stage,
    count: artists.filter((artist) => artist.stage === stage.value).length,
  }));
  return {
    rosterCount: roster.length,
    pipelineCount: pipeline.length,
    offerCount: offers.length,
    unrecouped,
    payable,
    snaps,
    hot: hotArtists(),
    due: dueProjects(),
    coming: comingReleases(),
    activity: recentActivity(),
    stageCounts,
  };
}

export function hasSample() {
  const placeholders = SEED_ARTIST_IDS.map(() => "?").join(",");
  const row = one<{ n: number }>(`SELECT COUNT(*) AS n FROM artists WHERE id IN (${placeholders})`, ...SEED_ARTIST_IDS);
  return (row?.n ?? 0) > 0;
}

export function clearSample() {
  const db = getDb();
  transaction(db, () => {
    const removeArtist = db.prepare("DELETE FROM artists WHERE id = ?");
    for (const id of SEED_ARTIST_IDS) removeArtist.run(id);
    const linked = db.prepare("SELECT 1 AS ok FROM artist_people WHERE person_id = ?");
    const removePerson = db.prepare("DELETE FROM people WHERE id = ?");
    for (const id of SEED_PERSON_IDS) {
      if (!linked.get(id)) removePerson.run(id);
    }
  });
  logActivity(null, "Desk", "Sample artists cleared.");
}

export function searchDesk(query: string) {
  const q = query.trim();
  const empty = { artists: [] as Artist[], people: [] as PersonView[], releases: [] as ReleaseView[], tracks: [] as TrackView[], projects: [] as ProjectView[], influencers: [] as Influencer[] };
  if (!q) return empty;
  const like = `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
  const artists = many<Artist>(
    `SELECT * FROM artists a
     WHERE a.name LIKE ? ESCAPE '\\'
        OR IFNULL(a.legal_name, '') LIKE ? ESCAPE '\\'
        OR IFNULL(a.genre, '') LIKE ? ESCAPE '\\'
        OR IFNULL(a.base_city, '') LIKE ? ESCAPE '\\'
        OR IFNULL(a.hometown, '') LIKE ? ESCAPE '\\'
        OR IFNULL(a.ar_rep, '') LIKE ? ESCAPE '\\'
        OR IFNULL(a.interest, '') LIKE ? ESCAPE '\\'
        OR IFNULL(a.bio, '') LIKE ? ESCAPE '\\'
        OR IFNULL(a.ipi, '') LIKE ? ESCAPE '\\'
        OR EXISTS (SELECT 1 FROM notes n WHERE n.artist_id = a.id AND n.body LIKE ? ESCAPE '\\')
     ORDER BY a.name COLLATE NOCASE LIMIT 25`,
    ...Array(10).fill(like)
  );
  const people = listPeople().filter((person) => {
    const blob = [person.name, person.company, person.email, person.role, person.notes, person.ipi].join(" ").toLowerCase();
    return blob.includes(q.toLowerCase());
  });
  const influencers = listInfluencers().filter((person) => {
    const blob = [person.name, person.handle, person.email, person.phone, person.city, person.niche, person.platform, person.notes].join(" ").toLowerCase();
    return blob.includes(q.toLowerCase());
  });
  const releases = many<ReleaseView>(
    `SELECT releases.*, artists.name AS artist_name
     FROM releases JOIN artists ON artists.id = releases.artist_id
     WHERE releases.title LIKE ? ESCAPE '\\' OR IFNULL(releases.catalog_no, '') LIKE ? ESCAPE '\\'
     ORDER BY releases.title LIMIT 25`,
    like,
    like
  );
  const tracks = many<TrackView>(
    `SELECT tracks.*, artists.name AS artist_name, releases.title AS release_title
     FROM tracks
     JOIN artists ON artists.id = tracks.artist_id
     LEFT JOIN releases ON releases.id = tracks.release_id
     WHERE tracks.title LIKE ? ESCAPE '\\'
        OR IFNULL(tracks.isrc, '') LIKE ? ESCAPE '\\'
        OR IFNULL(tracks.writers, '') LIKE ? ESCAPE '\\'
        OR IFNULL(tracks.writer_ipis, '') LIKE ? ESCAPE '\\'
        OR IFNULL(tracks.producers, '') LIKE ? ESCAPE '\\'
     ORDER BY tracks.title LIMIT 25`,
    like,
    like,
    like,
    like,
    like
  );
  const projects = listProjectViews().filter((project) => project.name.toLowerCase().includes(q.toLowerCase()));
  return { artists, people, releases, tracks, projects, influencers };
}

export function changeStage(id: string, stage: string) {
  const artist = getArtist(id);
  if (!artist) return;
  const signed = isRoster(stage) && !artist.signed_date ? new Date().toISOString().slice(0, 10) : artist.signed_date;
  updateRow(getDb(), "artists", id, {
    stage,
    signed_date: signed,
    updated_at: new Date().toISOString(),
  });
  logActivity(id, "Stage", `${artist.name} is now ${labelFor(STAGES, stage)}.`);
}

export function removeArtist(id: string) {
  const db = getDb();
  transaction(db, () => {
    db.prepare("UPDATE projects SET release_id = NULL WHERE artist_id = ?").run(id);
    db.prepare("UPDATE royalties SET release_id = NULL WHERE artist_id = ?").run(id);
    db.prepare("DELETE FROM artists WHERE id = ?").run(id);
  });
}

export function removeRelease(id: string) {
  const db = getDb();
  transaction(db, () => {
    db.prepare("UPDATE projects SET release_id = NULL WHERE release_id = ?").run(id);
    db.prepare("UPDATE royalties SET release_id = NULL WHERE release_id = ?").run(id);
    db.prepare("DELETE FROM releases WHERE id = ?").run(id);
  });
}
