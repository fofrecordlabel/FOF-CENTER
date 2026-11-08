import { BIGDEUCE_LOGO } from "./brand";
import { DEFAULT_TASKS } from "./checklist";
import { addDays, today } from "./format";
import { isRoster, labelFor, PIPELINE_STAGES, ROSTER_STAGES, STAGES } from "./labels";
import { query } from "./pg";
import { SEED_ARTIST_IDS, SEED_PERSON_IDS } from "./seed";
import { exec, insert, removeRow, uid, updateRow, type SqlValue } from "./sql";
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
  ChecklistEvent,
  ChecklistTemplate,
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
  Todo,
  Expense,
  Takedown,
  Track,
  TrackView,
} from "./types";

let deskReady: Promise<void> | null = null;

function ready() {
  if (!deskReady) {
    deskReady = ensureDesk().catch((error) => {
      deskReady = null;
      throw error;
    });
  }
  return deskReady;
}

async function ensureDesk() {
  await seedDailyTasks();
  const named = await query<{ id: string; image_url: string | null }>(
    "SELECT id, image_url FROM artists WHERE id = ? OR lower(name) = 'bigdeucefof'",
    ["art_bigdeucefof"]
  );
  const now = new Date().toISOString();
  if (named.length === 0) {
    const count = await query<{ n: number }>("SELECT COUNT(*) AS n FROM artists");
    if ((count[0]?.n ?? 0) === 0) {
      await insert("artists", {
        id: "art_bigdeucefof",
        stage: "active",
        priority: "high",
        name: "BIGDEUCEFOF",
        image_url: BIGDEUCE_LOGO,
        created_at: now,
        updated_at: now,
      });
      await insert("activity", {
        id: "act_bigdeucefof",
        artist_id: "art_bigdeucefof",
        action: "File",
        detail: "BIGDEUCEFOF is the only artist on the desk.",
        created_at: now,
      });
    }
    return;
  }
  for (const artist of named) {
    if (!artist.image_url?.trim()) {
      await exec("UPDATE artists SET image_url = ? WHERE id = ?", BIGDEUCE_LOGO, artist.id);
    }
  }
}

function plain<T>(row: T): T {
  if (row == null || typeof row !== "object") return row;
  if (Array.isArray(row)) return row.map((item) => plain(item)) as T;
  return Object.fromEntries(Object.entries(row as Record<string, unknown>).map(([key, value]) => [key, plain(value)])) as T;
}

async function one<T>(sql: string, ...args: SqlValue[]): Promise<T | null> {
  await ready();
  const rows = await query<T>(sql, args);
  return rows[0] == null ? null : plain(rows[0]);
}

async function many<T>(sql: string, ...args: SqlValue[]): Promise<T[]> {
  await ready();
  return plain(await query<T>(sql, args));
}

export async function writeRow(table: string, id: string | null, fields: Record<string, SqlValue>) {
  await ready();
  if (id) {
    await updateRow(table, id, fields);
    return id;
  }
  const newId = uid();
  await insert(table, { ...fields, id: newId });
  return newId;
}

export async function destroy(table: string, id: string) {
  await ready();
  await removeRow(table, id);
}

export async function touchArtist(id: string) {
  await exec("UPDATE artists SET updated_at = ? WHERE id = ?", new Date().toISOString(), id);
}

export async function logActivity(artistId: string | null, action: string, detail: string) {
  await insert("activity", {
    id: uid(),
    artist_id: artistId,
    action,
    detail,
    created_at: new Date().toISOString(),
  });
}

export async function listArtists() {
  return await many<Artist>(
    `SELECT * FROM artists
     ORDER BY CASE priority WHEN 'rush' THEN 0 WHEN 'high' THEN 1 WHEN 'standard' THEN 2 ELSE 3 END,
              name COLLATE NOCASE`
  );
}

export async function getArtist(id: string) {
  return await one<Artist>("SELECT * FROM artists WHERE id = ?", id);
}

export async function artistsIn(stages: string[]) {
  const all = await listArtists();
  return all.filter((artist) => stages.includes(artist.stage));
}

export async function listPeople(): Promise<PersonView[]> {
  const people = await many<Person>("SELECT * FROM people ORDER BY name COLLATE NOCASE");
  const links = await many<{ person_id: string; relationship: string | null; artist_id: string; artist_name: string }>(
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

export async function getPerson(id: string) {
  return await one<Person>("SELECT * FROM people WHERE id = ?", id);
}

export async function listInfluencers() {
  return await many<Influencer>("SELECT * FROM influencers ORDER BY name COLLATE NOCASE");
}

export async function listPostChecks(day: string) {
  return await many<{ slot_time: string; posted_at: string }>(
    "SELECT slot_time, posted_at FROM post_checks WHERE slot_date = ?",
    day
  );
}

export async function listLogs() {
  return await many<LogView>(
    `SELECT logs.*, artists.name AS artist_name
     FROM logs
     LEFT JOIN artists ON artists.id = logs.artist_id
     ORDER BY logs.log_date DESC, logs.created_at DESC`
  );
}

export async function listTemplates() {
  return await many<ChecklistTemplate>(
    `SELECT checklist_templates.*, releases.title AS release_title
     FROM checklist_templates
     LEFT JOIN releases ON releases.id = checklist_templates.release_id
     ORDER BY checklist_templates.archived ASC, checklist_templates.sort_order ASC, checklist_templates.created_at ASC`
  );
}

export async function getTemplate(id: string) {
  return await one<ChecklistTemplate>("SELECT * FROM checklist_templates WHERE id = ?", id);
}

async function seedDailyTasks() {
  const stamp = new Date().toISOString();
  for (const task of DEFAULT_TASKS) {
    try {
      await exec(
        `INSERT INTO checklist_templates (id, title, release_id, created_at, archived, sort_order, locked)
         SELECT ?, ?, NULL, ?, 0, ?, 1
         WHERE NOT EXISTS (
           SELECT 1 FROM checklist_templates WHERE id = ? OR lower(title) = lower(?)
         )`,
        task.id,
        task.title,
        stamp,
        task.sort_order,
        task.id,
        task.title
      );
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
    }
    await exec(
      "UPDATE checklist_templates SET locked = 1, sort_order = ? WHERE lower(title) = lower(?)",
      task.sort_order,
      task.title
    );
  }
}

async function copyDailyChecklist() {
  const day = today();
  const templates = await query<{ id: string; title: string; release_id: string | null; reminder: string | null }>(
    "SELECT id, title, release_id, reminder FROM checklist_templates WHERE archived = 0"
  );
  if (!templates.length) return;
  const existing = await query<{ template_id: string }>(
    "SELECT template_id FROM todos WHERE todo_date = ? AND template_id IS NOT NULL",
    [day]
  );
  const have = new Set(existing.map((row) => row.template_id));
  const stamp = new Date().toISOString();
  for (const template of templates) {
    if (have.has(template.id)) continue;
    try {
      await insert("todos", {
        id: uid(),
        todo_date: day,
        title: template.title,
        done: 0,
        created_at: stamp,
        completed_at: null,
        release_id: template.release_id,
        template_id: template.id,
        notes: null,
        reminder: template.reminder,
      });
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
    }
  }
}

const TODO_SELECT = `SELECT todos.*, releases.title AS release_title,
       checklist_templates.locked AS template_locked,
       checklist_templates.notes AS template_notes,
       checklist_templates.sort_order AS template_sort
     FROM todos
     LEFT JOIN releases ON releases.id = todos.release_id
     LEFT JOIN checklist_templates ON checklist_templates.id = todos.template_id`;

export async function listTodos() {
  await ready();
  await copyDailyChecklist();
  return await many<Todo>(
    `${TODO_SELECT}
     ORDER BY todos.todo_date ASC, checklist_templates.sort_order ASC NULLS LAST, todos.created_at ASC`
  );
}

export async function getTodo(id: string) {
  return await one<Todo>(`${TODO_SELECT} WHERE todos.id = ?`, id);
}

export async function listChecklistEvents() {
  return await many<ChecklistEvent>("SELECT * FROM checklist_events ORDER BY created_at DESC");
}

export async function listListenerLogs(artistId?: string) {
  if (artistId) {
    return await many<ListenerLog>(
      "SELECT * FROM listener_logs WHERE artist_id = ? ORDER BY log_date ASC, created_at ASC",
      artistId
    );
  }
  return await many<ListenerLog>("SELECT * FROM listener_logs ORDER BY log_date ASC, created_at ASC");
}

export async function getListenerLog(id: string) {
  return await one<ListenerLog>("SELECT * FROM listener_logs WHERE id = ?", id);
}

export async function listSplits() {
  return await many<Split>("SELECT * FROM splits ORDER BY created_at ASC");
}

export async function getSplit(id: string) {
  return await one<Split>("SELECT * FROM splits WHERE id = ?", id);
}

export async function listCampaigns() {
  return await many<Campaign>("SELECT * FROM campaigns ORDER BY created_at DESC");
}

export async function getCampaign(id: string) {
  return await one<Campaign>("SELECT * FROM campaigns WHERE id = ?", id);
}

export async function listBookings() {
  return await many<CampaignBooking>(
    `SELECT campaign_bookings.*, influencers.name AS influencer_name, influencers.handle AS handle
     FROM campaign_bookings
     LEFT JOIN influencers ON influencers.id = campaign_bookings.influencer_id
     ORDER BY campaign_bookings.created_at ASC`
  );
}

export async function getBooking(id: string) {
  return await one<CampaignBooking>(
    `SELECT campaign_bookings.*, influencers.name AS influencer_name, influencers.handle AS handle
     FROM campaign_bookings
     LEFT JOIN influencers ON influencers.id = campaign_bookings.influencer_id
     WHERE campaign_bookings.id = ?`,
    id
  );
}

export async function syncListeners(artistId: string) {
  const latest = await one<{ listeners: number }>(
    "SELECT listeners FROM listener_logs WHERE artist_id = ? ORDER BY log_date DESC, created_at DESC LIMIT 1",
    artistId
  );
  const now = new Date().toISOString();
  if (latest) {
    await exec("UPDATE artists SET monthly_listeners = ?, updated_at = ? WHERE id = ?", latest.listeners, now, artistId);
  } else {
    await exec("UPDATE artists SET monthly_listeners = NULL, updated_at = ? WHERE id = ?", now, artistId);
  }
}

export async function getLog(id: string) {
  return await one<LogView>(
    `SELECT logs.*, artists.name AS artist_name
     FROM logs
     LEFT JOIN artists ON artists.id = logs.artist_id
     WHERE logs.id = ?`,
    id
  );
}

export async function getInfluencer(id: string) {
  return await one<Influencer>("SELECT * FROM influencers WHERE id = ?", id);
}

export async function linkPerson(artistId: string, personId: string, relationship: string | null) {
  await ready();
  await exec(
    `INSERT INTO artist_people (artist_id, person_id, relationship)
     VALUES (?, ?, ?)
     ON CONFLICT (artist_id, person_id) DO UPDATE SET relationship = excluded.relationship`,
    artistId,
    personId,
    relationship
  );
}

export async function unlinkPerson(artistId: string, personId: string) {
  await exec("DELETE FROM artist_people WHERE artist_id = ? AND person_id = ?", artistId, personId);
}

export async function listContracts(artistId?: string) {
  if (artistId) return await many<Contract>("SELECT * FROM contracts WHERE artist_id = ? ORDER BY created_at DESC", artistId);
  return await many<Contract>("SELECT * FROM contracts ORDER BY created_at DESC");
}

export async function listContractViews() {
  return await many<ContractView>(
    `SELECT contracts.*, artists.name AS artist_name
     FROM contracts JOIN artists ON artists.id = contracts.artist_id
     ORDER BY contracts.created_at DESC`
  );
}

export async function getContract(id: string) {
  return await one<Contract>("SELECT * FROM contracts WHERE id = ?", id);
}

export async function listReleaseViews() {
  return await many<ReleaseView>(
    `SELECT releases.*, artists.name AS artist_name
     FROM releases JOIN artists ON artists.id = releases.artist_id
     ORDER BY releases.title COLLATE NOCASE`
  );
}

export async function getRelease(id: string) {
  return await one<ReleaseView>(
    `SELECT releases.*, artists.name AS artist_name
     FROM releases JOIN artists ON artists.id = releases.artist_id
     WHERE releases.id = ?`,
    id
  );
}

export async function listTracksForRelease(releaseId: string) {
  return await many<Track>("SELECT * FROM tracks WHERE release_id = ? ORDER BY track_number, title COLLATE NOCASE", releaseId);
}

export async function listReleaseMasters() {
  return await many<{ release_id: string; id: string; title: string; audio_url: string | null }>(
    `SELECT tracks.release_id, tracks.id, tracks.title,
       CASE WHEN files.id IS NOT NULL THEN tracks.audio_url ELSE NULL END AS audio_url
     FROM tracks
     LEFT JOIN files ON tracks.audio_url = '/media/' || files.id::text
     WHERE tracks.release_id IS NOT NULL
     ORDER BY tracks.track_number, tracks.title COLLATE NOCASE`
  );
}

export async function listTrackViews() {
  return await many<TrackView>(
    `SELECT tracks.*, artists.name AS artist_name, releases.title AS release_title
     FROM tracks
     JOIN artists ON artists.id = tracks.artist_id
     LEFT JOIN releases ON releases.id = tracks.release_id
     ORDER BY artists.name COLLATE NOCASE, releases.title, tracks.track_number`
  );
}

export async function getTrack(id: string) {
  return await one<Track>("SELECT * FROM tracks WHERE id = ?", id);
}

export async function listTakedowns() {
  return await many<Takedown>("SELECT * FROM takedowns ORDER BY taken_down_at DESC, created_at DESC");
}

export async function getTakedown(id: string) {
  return await one<Takedown>("SELECT * FROM takedowns WHERE id = ?", id);
}

export async function listExpenses() {
  return await many<Expense>("SELECT * FROM expenses ORDER BY spent_on DESC, created_at DESC");
}

export async function listProjectViews() {
  return await many<ProjectView>(
    `SELECT projects.*, artists.name AS artist_name, releases.title AS release_title
     FROM projects
     LEFT JOIN artists ON artists.id = projects.artist_id
     LEFT JOIN releases ON releases.id = projects.release_id
     ORDER BY CASE WHEN projects.due_date IS NULL THEN 1 ELSE 0 END, projects.due_date ASC`
  );
}

export async function getProject(id: string) {
  return await one<Project>("SELECT * FROM projects WHERE id = ?", id);
}

export async function listRoyaltyViews() {
  return await many<RoyaltyView>(
    `SELECT royalties.*, artists.name AS artist_name, releases.title AS release_title
     FROM royalties
     JOIN artists ON artists.id = royalties.artist_id
     LEFT JOIN releases ON releases.id = royalties.release_id
     ORDER BY royalties.created_at DESC`
  );
}

export async function getRoyalty(id: string) {
  return await one<Royalty>("SELECT * FROM royalties WHERE id = ?", id);
}

export async function getNote(id: string) {
  return await one<Note>("SELECT * FROM notes WHERE id = ?", id);
}

export async function moneySnapshot(artistId: string): Promise<MoneySnapshot> {
  const contracts = (await listContracts(artistId)).filter((contract) => contract.status === "executed" && contract.recoupable === 1);
  const advance = contracts.reduce((sum, contract) => sum + contract.advance_cents, 0);
  const sums = await one<{ recouped: number; gross: number }>(
    "SELECT COALESCE(SUM(recoup_cents), 0) AS recouped, COALESCE(SUM(gross_cents), 0) AS gross FROM royalties WHERE artist_id = ?",
    artistId
  );
  const recouped = sums?.recouped ?? 0;
  const gross = sums?.gross ?? 0;
  return { advance, recouped, gross, balance: advance - recouped };
}

export async function primaryDeal(artistId: string) {
  const deals = await listContracts(artistId);
  return deals.find((deal) => deal.status === "executed") ?? deals[0] ?? null;
}

export async function getDossier(id: string): Promise<Dossier | null> {
  const artist = await getArtist(id);
  if (!artist) return null;
  const people = await listPeople();
  const linked = people
    .filter((person) => person.artists.some((link) => link.id === id))
    .map((person) => ({
      ...person,
      relationship: person.artists.find((link) => link.id === id)?.relationship ?? null,
    }));
  const releaseRows = await many<Release>("SELECT * FROM releases WHERE artist_id = ? ORDER BY title COLLATE NOCASE", id);
  const releases = [];
  for (const release of releaseRows) {
    releases.push({ ...release, tracks: await listTracksForRelease(release.id) });
  }
  return {
    artist,
    people: linked,
    directory: people
      .filter((person) => !person.artists.some((link) => link.id === id))
      .map((person) => ({ id: person.id, name: person.name, role: person.role, company: person.company })),
    contracts: await listContracts(id),
    releases,
    projects: await many<Project>("SELECT * FROM projects WHERE artist_id = ? ORDER BY due_date IS NULL, due_date", id),
    royalties: await many<Royalty>("SELECT * FROM royalties WHERE artist_id = ? ORDER BY created_at DESC", id),
    notes: await many<Note>("SELECT * FROM notes WHERE artist_id = ? ORDER BY created_at DESC", id),
    activity: await many<Activity>("SELECT * FROM activity WHERE artist_id = ? ORDER BY created_at DESC LIMIT 30", id),
    money: await moneySnapshot(id),
    releaseOptions: releases.map((release) => ({ id: release.id, title: release.title })),
  };
}

export async function rosterRows() {
  const artists = await artistsIn(ROSTER_STAGES.map((stage) => stage.value));
  const rows = [];
  for (const artist of artists) {
    rows.push({ artist, deal: await primaryDeal(artist.id), ...(await moneySnapshot(artist.id)) });
  }
  return rows.sort((a, b) => a.artist.name.localeCompare(b.artist.name));
}

export async function hotArtists() {
  const rank: Record<string, number> = { rush: 0, high: 1, standard: 2, low: 3 };
  const artists = await listArtists();
  return artists
    .filter((artist) => {
      const inPipeline = PIPELINE_STAGES.some((stage) => stage.value === artist.stage);
      if (!inPipeline) return false;
      return artist.priority === "rush" || artist.priority === "high" || artist.stage === "offer" || artist.stage === "legal";
    })
    .sort((a, b) => (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9) || a.name.localeCompare(b.name));
}

export async function dueProjects() {
  const day = today();
  const soon = addDays(day, 21);
  const projects = await listProjectViews();
  return projects
    .filter(
      (project) =>
        project.due_date &&
        (project.status === "planned" || project.status === "active") &&
        project.due_date <= soon &&
        project.due_date >= "2000-01-01"
    )
    .map((project) => ({ ...project, overdue: Boolean(project.due_date && project.due_date < day) }));
}

export async function comingReleases() {
  const releases = await listReleaseViews();
  return releases.filter((release) => ["scheduled", "production", "delivered"].includes(release.status));
}

export async function recentActivity() {
  return await many<ActivityView>(
    `SELECT activity.*, artists.name AS artist_name
     FROM activity LEFT JOIN artists ON artists.id = activity.artist_id
     ORDER BY activity.created_at DESC LIMIT 10`
  );
}

export async function dashboard() {
  const artists = await listArtists();
  const roster = artists.filter((artist) => isRoster(artist.stage));
  const pipeline = artists.filter((artist) => PIPELINE_STAGES.some((stage) => stage.value === artist.stage));
  const offers = artists.filter((artist) => artist.stage === "offer" || artist.stage === "legal");
  const snaps = [];
  for (const artist of roster) snaps.push({ artist, ...(await moneySnapshot(artist.id)) });
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
    hot: await hotArtists(),
    due: await dueProjects(),
    coming: await comingReleases(),
    activity: await recentActivity(),
    stageCounts,
  };
}

export async function hasSample() {
  const placeholders = SEED_ARTIST_IDS.map(() => "?").join(",");
  const row = await one<{ n: number }>(`SELECT COUNT(*) AS n FROM artists WHERE id IN (${placeholders})`, ...SEED_ARTIST_IDS);
  return (row?.n ?? 0) > 0;
}

export async function clearSample() {
  for (const id of SEED_ARTIST_IDS) await exec("DELETE FROM artists WHERE id = ?", id);
  for (const id of SEED_PERSON_IDS) {
    const linked = await one<{ ok: number }>("SELECT 1 AS ok FROM artist_people WHERE person_id = ?", id);
    if (!linked) await exec("DELETE FROM people WHERE id = ?", id);
  }
  await logActivity(null, "Desk", "Sample artists cleared.");
}

export async function searchDesk(query: string) {
  const q = query.trim();
  const empty = { artists: [] as Artist[], people: [] as PersonView[], releases: [] as ReleaseView[], tracks: [] as TrackView[], projects: [] as ProjectView[], influencers: [] as Influencer[] };
  if (!q) return empty;
  const like = `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
  const artists = await many<Artist>(
    `SELECT * FROM artists a
     WHERE a.name LIKE ? ESCAPE '\\'
        OR COALESCE(a.legal_name, '') LIKE ? ESCAPE '\\'
        OR COALESCE(a.genre, '') LIKE ? ESCAPE '\\'
        OR COALESCE(a.base_city, '') LIKE ? ESCAPE '\\'
        OR COALESCE(a.hometown, '') LIKE ? ESCAPE '\\'
        OR COALESCE(a.ar_rep, '') LIKE ? ESCAPE '\\'
        OR COALESCE(a.interest, '') LIKE ? ESCAPE '\\'
        OR COALESCE(a.bio, '') LIKE ? ESCAPE '\\'
        OR COALESCE(a.ipi, '') LIKE ? ESCAPE '\\'
        OR EXISTS (SELECT 1 FROM notes n WHERE n.artist_id = a.id AND n.body LIKE ? ESCAPE '\\')
     ORDER BY a.name COLLATE NOCASE LIMIT 25`,
    ...Array(10).fill(like)
  );
  const people = (await listPeople()).filter((person) => {
    const blob = [person.name, person.company, person.email, person.role, person.notes, person.ipi].join(" ").toLowerCase();
    return blob.includes(q.toLowerCase());
  });
  const influencers = (await listInfluencers()).filter((person) => {
    const blob = [person.name, person.handle, person.email, person.phone, person.city, person.niche, person.platform, person.notes].join(" ").toLowerCase();
    return blob.includes(q.toLowerCase());
  });
  const releases = await many<ReleaseView>(
    `SELECT releases.*, artists.name AS artist_name
     FROM releases JOIN artists ON artists.id = releases.artist_id
     WHERE releases.title LIKE ? ESCAPE '\\' OR COALESCE(releases.catalog_no, '') LIKE ? ESCAPE '\\'
     ORDER BY releases.title LIMIT 25`,
    like,
    like
  );
  const tracks = await many<TrackView>(
    `SELECT tracks.*, artists.name AS artist_name, releases.title AS release_title
     FROM tracks
     JOIN artists ON artists.id = tracks.artist_id
     LEFT JOIN releases ON releases.id = tracks.release_id
     WHERE tracks.title LIKE ? ESCAPE '\\'
        OR COALESCE(tracks.isrc, '') LIKE ? ESCAPE '\\'
        OR COALESCE(tracks.writers, '') LIKE ? ESCAPE '\\'
        OR COALESCE(tracks.writer_ipis, '') LIKE ? ESCAPE '\\'
        OR COALESCE(tracks.producers, '') LIKE ? ESCAPE '\\'
     ORDER BY tracks.title LIMIT 25`,
    like,
    like,
    like,
    like,
    like
  );
  const projects = (await listProjectViews()).filter((project) => project.name.toLowerCase().includes(q.toLowerCase()));
  return { artists, people, releases, tracks, projects, influencers };
}

export async function changeStage(id: string, stage: string) {
  const artist = await getArtist(id);
  if (!artist) return;
  const signed = isRoster(stage) && !artist.signed_date ? today() : artist.signed_date;
  await updateRow("artists", id, {
    stage,
    signed_date: signed,
    updated_at: new Date().toISOString(),
  });
  await logActivity(id, "Stage", `${artist.name} is now ${labelFor(STAGES, stage)}.`);
}

export async function removeArtist(id: string) {
  await exec("UPDATE projects SET release_id = NULL WHERE artist_id = ?", id);
  await exec("UPDATE royalties SET release_id = NULL WHERE artist_id = ?", id);
  await exec("DELETE FROM artists WHERE id = ?", id);
}

export async function removeRelease(id: string) {
  const release = await getRelease(id);
  const tracks = await listTracksForRelease(id);
  await exec("UPDATE projects SET release_id = NULL WHERE release_id = ?", id);
  await exec("UPDATE royalties SET release_id = NULL WHERE release_id = ?", id);
  await exec("DELETE FROM releases WHERE id = ?", id);
  const { forgetMedia } = await import("./media");
  if (release) await forgetMedia(release.cover_url);
  for (const track of tracks) await forgetMedia(track.audio_url);
}
