"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  changeStage,
  clearSample,
  destroy,
  getArtist,
  getBooking,
  getCampaign,
  getContract,
  getInfluencer,
  getListenerLog,
  getLog,
  getNote,
  getPerson,
  getProject,
  getRelease,
  getRoyalty,
  getSplit,
  getTodo,
  getTrack,
  linkPerson,
  logActivity,
  removeArtist,
  removeRelease,
  syncListeners,
  touchArtist,
  unlinkPerson,
  writeRow,
} from "@/lib/db";
import { codesMatch, deskToken } from "@/lib/gate";
import { today } from "@/lib/format";
import { CAMPAIGN_STATUSES, DEAL_STATUSES, DEAL_TYPES, INFLUENCER_STATUSES, LOG_KINDS, PLATFORMS, PRIORITIES, PROJECT_KINDS, PROJECT_STATUSES, RELEASE_STATUSES, RELEASE_TYPES, ROLES, ROYALTY_SOURCES, SPLIT_ROLES, STAGES, values } from "@/lib/labels";
import { day, dollars, flag, httpUrl, mediaUrl, oneOf, optFloat, optInt, parseDuration, percent, safePath, str } from "@/lib/parse";
import { exec, insert, uid } from "@/lib/sql";

function go(path: string, message?: string): never {
  revalidatePath("/", "layout");
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  if (message) {
    params.set("error", message);
    params.delete("saved");
  } else {
    params.delete("error");
    params.set("saved", "1");
  }
  const qs = params.toString();
  redirect(qs ? `${base}?${qs}` : base);
}

async function run(path: string, work: () => Promise<void>, message = "Could not save that."): Promise<never> {
  try {
    await work();
  } catch (error) {
    console.error(error);
    go(path, message);
  }
  go(path);
}

function now() {
  return new Date().toISOString();
}

export async function createArtist(formData: FormData) {
  const name = str(formData, "name", 160);
  if (!name) go("/artists/new", "A name is required.");
  const fields = artistFields(formData, name);
  let id = "";
  try {
    id = await writeRow("artists", null, { ...fields, created_at: now(), updated_at: now() });
    await logActivity(id, "File", `${name} added to the desk.`);
  } catch (error) {
    console.error(error);
    go("/artists/new", "Could not add that artist.");
  }
  go(`/artists/${id}`);
}

export async function updateArtist(formData: FormData) {
  const id = str(formData, "id", 80);
  const back = id ? `/artists/${id}/edit` : "/roster";
  const name = str(formData, "name", 160);
  if (!id || !(await getArtist(id))) go("/roster", "That artist is not on file.");
  if (!name) go(back, "A name is required.");
  await run(`/artists/${id}`, async () => {
    await writeRow("artists", id, { ...artistFields(formData, name), updated_at: now() });
    await logActivity(id, "File", `${name} updated.`);
  });
}

export async function deleteArtist(formData: FormData) {
  const id = str(formData, "id", 80);
  const artist = id ? await getArtist(id) : null;
  if (!id || !artist) go("/roster", "That artist is not on file.");
  const dest = artist.stage === "passed" || !["signed", "active", "paused", "catalog"].includes(artist.stage) ? "/pipeline" : "/roster";
  try {
    await removeArtist(id);
  } catch (error) {
    console.error(error);
    go(`/artists/${id}`, "Could not delete that artist.");
  }
  go(dest);
}

export async function setStage(formData: FormData) {
  const id = str(formData, "id", 80);
  const stage = oneOf(str(formData, "stage", 40), values(STAGES), "");
  if (!id || !stage || !(await getArtist(id))) return;
  try {
    await changeStage(id, stage);
  } catch (error) {
    console.error(error);
  }
  revalidatePath("/", "layout");
}

export async function signArtist(formData: FormData) {
  const id = str(formData, "id", 80);
  if (!id || !(await getArtist(id))) go("/pipeline", "That artist is not on file.");
  await run(`/artists/${id}`, async () => { await changeStage(id, "signed"); });
}

export async function passArtist(formData: FormData) {
  const id = str(formData, "id", 80);
  if (!id || !(await getArtist(id))) go("/pipeline", "That artist is not on file.");
  await run(`/artists/${id}`, async () => { await changeStage(id, "passed"); });
}

export async function createContract(formData: FormData) {
  const next = safePath(str(formData, "next"), "/deals");
  const artistId = str(formData, "artist_id", 80);
  const title = str(formData, "title", 180);
  if (!artistId || !(await getArtist(artistId))) go(next, "Pick an artist.");
  if (!title) go(next, "A deal needs a title.");
  await run(next, async () => {
    await writeRow("contracts", null, { ...contractFields(formData, artistId, title), created_at: now() });
    await touchArtist(artistId);
    await logActivity(artistId, "Deal", `${title} added.`);
  });
}

export async function updateContract(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/deals");
  const deal = id ? await getContract(id) : null;
  const title = str(formData, "title", 180);
  if (!deal) go(next, "That deal is not on file.");
  if (!title) go(next, "A deal needs a title.");
  const artistId = str(formData, "artist_id", 80) ?? deal.artist_id;
  if (!(await getArtist(artistId))) go(next, "Pick an artist.");
  await run(next, async () => {
    await writeRow("contracts", deal.id, contractFields(formData, artistId, title));
    await touchArtist(artistId);
    await logActivity(artistId, "Deal", `${title} updated.`);
  });
}

export async function deleteContract(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/deals");
  const deal = id ? await getContract(id) : null;
  if (!deal) go(next);
  await run(next, async () => {
    await destroy("contracts", deal.id);
    await touchArtist(deal.artist_id);
    await logActivity(deal.artist_id, "Deal", `${deal.title} removed.`);
  });
}

export async function createRelease(formData: FormData) {
  const next = safePath(str(formData, "next"), "/releases");
  const artistId = str(formData, "artist_id", 80);
  const title = str(formData, "title", 180);
  if (!artistId || !(await getArtist(artistId))) go(next, "Pick an artist.");
  if (!title) go(next, "A release needs a title.");
  let id = "";
  try {
    id = await writeRow("releases", null, { ...releaseFields(formData, artistId, title), created_at: now() });
    await touchArtist(artistId);
    await logActivity(artistId, "Release", `${title} added.`);
  } catch (error) {
    console.error(error);
    go(next, "Could not add that release.");
  }
  const stay = str(formData, "stay");
  go(stay ? next : `/releases/${id}`);
}

export async function updateRelease(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), id ? `/releases/${id}` : "/releases");
  const release = id ? await getRelease(id) : null;
  const title = str(formData, "title", 180);
  if (!release) go("/releases", "That release is not on file.");
  if (!title) go(next, "A release needs a title.");
  const artistId = str(formData, "artist_id", 80) ?? release.artist_id;
  await run(next, async () => {
    await writeRow("releases", release.id, releaseFields(formData, artistId, title));
    await touchArtist(artistId);
    await logActivity(artistId, "Release", `${title} updated.`);
  });
}

export async function deleteRelease(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/releases");
  const release = id ? await getRelease(id) : null;
  if (!release) go(next);
  try {
    await removeRelease(release.id);
    await touchArtist(release.artist_id);
    await logActivity(release.artist_id, "Release", `${release.title} removed.`);
  } catch (error) {
    console.error(error);
    go(next, "Could not delete that release.");
  }
  go(next);
}

export async function createTrack(formData: FormData) {
  const next = safePath(str(formData, "next"), "/catalog");
  const title = str(formData, "title", 180);
  if (!title) go(next, "A master needs a title.");
  const releaseId = str(formData, "release_id", 80);
  const release = releaseId ? await getRelease(releaseId) : null;
  if (releaseId && !release) go(next, "That release is not on file.");
  const artistId = release?.artist_id ?? str(formData, "artist_id", 80);
  if (!artistId || !(await getArtist(artistId))) go(next, "Pick an artist.");
  await run(next, async () => {
    await writeRow("tracks", null, { ...trackFields(formData, artistId, release?.id ?? null, title), created_at: now() });
    await touchArtist(artistId);
    await logActivity(artistId, "Master", `${title} added.`);
  });
}

export async function updateTrack(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/catalog");
  const track = id ? await getTrack(id) : null;
  const title = str(formData, "title", 180);
  if (!track) go(next, "That master is not on file.");
  if (!title) go(next, "A master needs a title.");
  const releaseId = str(formData, "release_id", 80);
  const release = releaseId ? await getRelease(releaseId) : null;
  if (releaseId && !release) go(next, "That release is not on file.");
  const artistId = release?.artist_id ?? track.artist_id;
  await run(next, async () => {
    await writeRow("tracks", track.id, trackFields(formData, artistId, release?.id ?? null, title));
    await touchArtist(artistId);
    await logActivity(artistId, "Master", `${title} updated.`);
  });
}

export async function deleteTrack(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/catalog");
  const track = id ? await getTrack(id) : null;
  if (!track) go(next);
  await run(next, async () => {
    await destroy("tracks", track.id);
    await touchArtist(track.artist_id);
    await logActivity(track.artist_id, "Master", `${track.title} removed.`);
  });
}

export async function createProject(formData: FormData) {
  const next = safePath(str(formData, "next"), "/projects");
  const name = str(formData, "name", 180);
  if (!name) go(next, "A budget needs a name.");
  const artistId = str(formData, "artist_id", 80);
  if (artistId && !(await getArtist(artistId))) go(next, "That artist is not on file.");
  await run(next, async () => {
    await writeRow("projects", null, { ...projectFields(formData, artistId, name), created_at: now() });
    if (artistId) {
      await touchArtist(artistId);
      await logActivity(artistId, "Budget", `${name} opened.`);
    }
  });
}

export async function updateProject(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/projects");
  const project = id ? await getProject(id) : null;
  const name = str(formData, "name", 180);
  if (!project) go(next, "That budget is not on file.");
  if (!name) go(next, "A budget needs a name.");
  const artistId = str(formData, "artist_id", 80);
  await run(next, async () => {
    await writeRow("projects", project.id, projectFields(formData, artistId, name));
    if (artistId) {
      await touchArtist(artistId);
      await logActivity(artistId, "Budget", `${name} updated.`);
    }
  });
}

export async function deleteProject(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/projects");
  const project = id ? await getProject(id) : null;
  if (!project) go(next);
  await run(next, async () => {
    await destroy("projects", project.id);
    if (project.artist_id) await logActivity(project.artist_id, "Budget", `${project.name} removed.`);
  });
}

export async function createRoyalty(formData: FormData) {
  const next = safePath(str(formData, "next"), "/catalog");
  const artistId = str(formData, "artist_id", 80);
  const period = str(formData, "period", 40);
  if (!artistId || !(await getArtist(artistId))) go(next, "Pick an artist.");
  if (!period) go(next, "A statement needs a period.");
  await run(next, async () => {
    await writeRow("royalties", null, { ...royaltyFields(formData, artistId, period), created_at: now() });
    await touchArtist(artistId);
    await logActivity(artistId, "Royalties", `${period} statement logged.`);
  });
}

export async function updateRoyalty(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/catalog");
  const royalty = id ? await getRoyalty(id) : null;
  const period = str(formData, "period", 40);
  if (!royalty) go(next, "That statement is not on file.");
  if (!period) go(next, "A statement needs a period.");
  const artistId = str(formData, "artist_id", 80) ?? royalty.artist_id;
  await run(next, async () => {
    await writeRow("royalties", royalty.id, royaltyFields(formData, artistId, period));
    await touchArtist(artistId);
    await logActivity(artistId, "Royalties", `${period} statement updated.`);
  });
}

export async function deleteRoyalty(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/catalog");
  const royalty = id ? await getRoyalty(id) : null;
  if (!royalty) go(next);
  await run(next, async () => {
    await destroy("royalties", royalty.id);
    await touchArtist(royalty.artist_id);
    await logActivity(royalty.artist_id, "Royalties", `${royalty.period} statement removed.`);
  });
}

export async function createPerson(formData: FormData) {
  const next = safePath(str(formData, "next"), "/people");
  const name = str(formData, "name", 160);
  if (!name) go(next, "A person needs a name.");
  await run(next, async () => {
    const id = await writeRow("people", null, { ...personFields(formData, name), created_at: now() });
    const artistId = str(formData, "artist_id", 80);
    if (artistId && await getArtist(artistId)) {
      await linkPerson(artistId, id, str(formData, "relationship", 120));
      await logActivity(artistId, "Team", `${name} added to the file.`);
    }
  });
}

export async function updatePerson(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/people");
  const person = id ? await getPerson(id) : null;
  const name = str(formData, "name", 160);
  if (!person) go(next, "That person is not in the directory.");
  if (!name) go(next, "A person needs a name.");
  await run(next, async () => {
    await writeRow("people", person.id, personFields(formData, name));
  });
}

export async function deletePerson(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/people");
  if (!id || !(await getPerson(id))) go(next);
  await run(next, async () => { await destroy("people", id); });
}

export async function attachTeam(formData: FormData) {
  const artistId = str(formData, "artist_id", 80);
  const next = safePath(str(formData, "next"), artistId ? `/artists/${artistId}` : "/people");
  if (!artistId || !(await getArtist(artistId))) go("/people", "Pick an artist.");
  const personId = str(formData, "person_id", 80);
  const name = str(formData, "name", 160);
  if (!personId && !name) go(next, "Pick someone, or enter a new name.");
  await run(next, async () => {
    const relationship = str(formData, "relationship", 120);
    if (personId) {
      if (!(await getPerson(personId))) throw new Error("Missing person");
      await linkPerson(artistId, personId, relationship);
      const person = await getPerson(personId);
      await logActivity(artistId, "Team", `${person?.name ?? "Someone"} linked to the file.`);
      return;
    }
    const id = await writeRow("people", null, { ...personFields(formData, name!), created_at: now() });
    await linkPerson(artistId, id, relationship);
    await logActivity(artistId, "Team", `${name} added to the file.`);
  });
}

export async function detachTeam(formData: FormData) {
  const artistId = str(formData, "artist_id", 80);
  const personId = str(formData, "person_id", 80);
  const next = safePath(str(formData, "next"), artistId ? `/artists/${artistId}` : "/people");
  if (!artistId || !personId) go(next);
  const person = await getPerson(personId);
  await run(next, async () => {
    await unlinkPerson(artistId, personId);
    await logActivity(artistId, "Team", `${person?.name ?? "Someone"} removed from the file.`);
  });
}

export async function createNote(formData: FormData) {
  const artistId = str(formData, "artist_id", 80);
  const next = safePath(str(formData, "next"), artistId ? `/artists/${artistId}` : "/");
  const body = str(formData, "body", 8000);
  if (!artistId || !(await getArtist(artistId))) go("/", "That artist is not on file.");
  if (!body) go(next, "Write the note first.");
  await run(next, async () => {
    await writeRow("notes", null, {
      artist_id: artistId,
      body,
      author: str(formData, "author", 120),
      created_at: now(),
    });
    await touchArtist(artistId);
    await logActivity(artistId, "Note", "A note was added to the file.");
  });
}

export async function updateNote(formData: FormData) {
  const id = str(formData, "id", 80);
  const note = id ? await getNote(id) : null;
  const next = safePath(str(formData, "next"), note ? `/artists/${note.artist_id}` : "/");
  const body = str(formData, "body", 8000);
  if (!note) go(next, "That note is gone.");
  if (!body) go(next, "Write the note first.");
  await run(next, async () => {
    await writeRow("notes", note.id, { body, author: str(formData, "author", 120) });
  });
}

export async function deleteNote(formData: FormData) {
  const id = str(formData, "id", 80);
  const note = id ? await getNote(id) : null;
  const next = safePath(str(formData, "next"), note ? `/artists/${note.artist_id}` : "/");
  if (!note) go(next);
  await run(next, async () => { await destroy("notes", note.id); });
}

export async function createInfluencer(formData: FormData) {
  const next = safePath(str(formData, "next"), "/influencers");
  const name = str(formData, "name", 160);
  if (!name) go(next, "An influencer needs a name.");
  if (!str(formData, "handle", 120) && !str(formData, "phone", 40)) go(next, "Add an @ or a phone number.");
  await run(next, async () => {
    await writeRow("influencers", null, { ...influencerFields(formData, name), created_at: now() });
  });
}

export async function updateInfluencer(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/influencers");
  const person = id ? await getInfluencer(id) : null;
  const name = str(formData, "name", 160);
  if (!person) go(next, "That influencer is not on the list.");
  if (!name) go(next, "An influencer needs a name.");
  if (!str(formData, "handle", 120) && !str(formData, "phone", 40)) go(next, "Add an @ or a phone number.");
  await run(next, async () => {
    await writeRow("influencers", person.id, influencerFields(formData, name));
  });
}

export async function createLog(formData: FormData) {
  const next = safePath(str(formData, "next"), "/log");
  const title = str(formData, "title", 180);
  if (!title) go(next, "A log entry needs a title.");
  await run(next, async () => {
    const fields = await logFields(formData, title);
    await writeRow("logs", null, { ...fields, created_at: now() });
    if (fields.artist_id && fields.status === "done") await logActivity(fields.artist_id, labelForKind(fields.kind), title);
  });
}

export async function updateLog(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/log");
  const entry = id ? await getLog(id) : null;
  const title = str(formData, "title", 180);
  if (!entry) go(next, "That log entry is not on file.");
  if (!title) go(next, "A log entry needs a title.");
  await run(next, async () => {
    await writeRow("logs", entry.id, await logFields(formData, title));
  });
}

export async function deleteLog(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/log");
  if (!id || !(await getLog(id))) go(next);
  await run(next, async () => { await destroy("logs", id); });
}

export async function unlockDesk(formData: FormData) {
  const code = str(formData, "code", 8) ?? "";
  if (!codesMatch(code)) redirect("/lock?error=1");
  const jar = await cookies();
  jar.set("fof_desk", await deskToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/");
}

export async function createTodo(formData: FormData) {
  const next = safePath(str(formData, "next"), "/");
  const title = str(formData, "title", 200);
  if (!title) go(next, "A checklist line needs words.");
  const releaseId = str(formData, "release_id", 80);
  const date = day(formData, "todo_date") ?? today();
  const repeat = flag(formData, "repeat") === 1;
  await run(next, async () => {
    const templateId = repeat ? uid() : null;
    if (templateId) {
      await insert("checklist_templates", {
        id: templateId,
        title,
        release_id: releaseId,
        created_at: now(),
      });
    }
    await writeRow("todos", null, {
      todo_date: date,
      title,
      done: 0,
      created_at: now(),
      completed_at: null,
      release_id: releaseId,
      template_id: templateId,
    });
  });
}

export async function toggleTodo(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/");
  const todo = id ? await getTodo(id) : null;
  if (!todo) go(next);
  await run(next, async () => {
    await writeRow("todos", todo.id, {
      done: todo.done ? 0 : 1,
      completed_at: todo.done ? null : now(),
    });
  });
}

export async function updateTodo(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/checklist");
  const title = str(formData, "title", 200);
  const todo = id ? await getTodo(id) : null;
  if (!todo) go(next, "That line is not on the checklist.");
  if (!title) go(next, "A checklist line needs words.");
  await run(next, async () => {
    await writeRow("todos", todo.id, {
      title,
      todo_date: day(formData, "todo_date") ?? todo.todo_date,
      release_id: str(formData, "release_id", 80),
    });
  });
}

export async function updateTemplate(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/checklist");
  const title = str(formData, "title", 200);
  if (!id) go(next, "That daily line is not on file.");
  if (!title) go(next, "A daily line needs words.");
  const releaseId = str(formData, "release_id", 80);
  await run(next, async () => {
    await writeRow("checklist_templates", id, { title, release_id: releaseId });
    await exec(
      "UPDATE todos SET title = ?, release_id = ? WHERE template_id = ? AND done = 0 AND todo_date >= ?",
      title,
      releaseId,
      id,
      today()
    );
  });
}

export async function deleteTemplate(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/checklist");
  if (!id) go(next);
  await run(next, async () => {
    await exec("DELETE FROM todos WHERE template_id = ? AND done = 0 AND todo_date >= ?", id, today());
    await destroy("checklist_templates", id);
  });
}

export async function deleteTodo(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/");
  if (!id || !(await getTodo(id))) go(next);
  await run(next, async () => { await destroy("todos", id); });
}

export async function markLogDone(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/week");
  const entry = id ? await getLog(id) : null;
  if (!entry) go(next);
  await run(next, async () => {
    await writeRow("logs", entry.id, { status: "done" });
    if (entry.artist_id) await logActivity(entry.artist_id, labelForKind(entry.kind), entry.title);
  });
}

export async function createSplit(formData: FormData) {
  const next = safePath(str(formData, "next"), "/catalog");
  const trackId = str(formData, "track_id", 80);
  const name = str(formData, "name", 160);
  const track = trackId ? await getTrack(trackId) : null;
  if (!track) go(next, "That master is not on file.");
  if (!name) go(next, "A split needs a name.");
  await run(next, async () => {
    await writeRow("splits", null, {
      track_id: track.id,
      name,
      role: oneOf(str(formData, "role", 40), values(SPLIT_ROLES), "writer"),
      share: percent(formData, "share"),
      ipi: cleanIpi(str(formData, "ipi", 20)),
      pro: str(formData, "pro", 40),
      created_at: now(),
    });
    await logActivity(track.artist_id, "Split", `${name} on ${track.title}.`);
  });
}

export async function deleteSplit(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/catalog");
  const split = id ? await getSplit(id) : null;
  if (!split) go(next);
  await run(next, async () => { await destroy("splits", split.id); });
}

export async function createCampaign(formData: FormData) {
  const next = safePath(str(formData, "next"), "/catalog");
  const releaseId = str(formData, "release_id", 80);
  const release = releaseId ? await getRelease(releaseId) : null;
  const name = str(formData, "name", 180);
  if (!release) go(next, "That release is not on file.");
  if (!name) go(next, "A campaign needs a name.");
  await run(next, async () => {
    await writeRow("campaigns", null, {
      release_id: release.id,
      artist_id: release.artist_id,
      name,
      status: oneOf(str(formData, "status", 40), values(CAMPAIGN_STATUSES), "planning"),
      budget_cents: dollars(formData, "budget"),
      notes: str(formData, "notes", 2000),
      created_at: now(),
    });
    await logActivity(release.artist_id, "Campaign", `${name} opened.`);
  });
}

export async function deleteCampaign(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/catalog");
  const campaign = id ? await getCampaign(id) : null;
  if (!campaign) go(next);
  await run(next, async () => { await destroy("campaigns", campaign.id); });
}

export async function createBooking(formData: FormData) {
  const next = safePath(str(formData, "next"), "/catalog");
  const campaignId = str(formData, "campaign_id", 80);
  const influencerId = str(formData, "influencer_id", 80);
  const campaign = campaignId ? await getCampaign(campaignId) : null;
  if (!campaign) go(next, "That campaign is not on file.");
  if (!influencerId || !(await getInfluencer(influencerId))) go(next, "Pick an influencer.");
  await run(next, async () => {
    await writeRow("campaign_bookings", null, {
      campaign_id: campaign.id,
      influencer_id: influencerId,
      paid: str(formData, "paid", 120),
      posted: flag(formData, "posted"),
      post_url: httpUrl(str(formData, "post_url", 400)),
      created_at: now(),
    });
  });
}

export async function updateBooking(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/catalog");
  const booking = id ? await getBooking(id) : null;
  if (!booking) go(next, "That booking is not on file.");
  await run(next, async () => {
    await writeRow("campaign_bookings", booking.id, {
      paid: str(formData, "paid", 120),
      posted: flag(formData, "posted"),
      post_url: httpUrl(str(formData, "post_url", 400)),
    });
  });
}

export async function deleteBooking(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/catalog");
  if (!id || !(await getBooking(id))) go(next);
  await run(next, async () => { await destroy("campaign_bookings", id); });
}

export async function createListenerLog(formData: FormData) {
  const next = safePath(str(formData, "next"), "/");
  const artistId = str(formData, "artist_id", 80);
  const listeners = optInt(formData, "listeners");
  if (!artistId || !(await getArtist(artistId))) go(next, "Pick an artist.");
  if (listeners == null) go(next, "Enter the monthly listeners.");
  const artist = await getArtist(artistId);
  await run(next, async () => {
    await writeRow("listener_logs", null, {
      artist_id: artistId,
      log_date: day(formData, "log_date") ?? today(),
      listeners,
      note: str(formData, "note", 400),
      created_at: now(),
    });
    await syncListeners(artistId);
    await logActivity(artistId, "Listeners", `${artist?.name ?? "Artist"} at ${listeners.toLocaleString("en-US")} monthly.`);
  });
}

export async function deleteListenerLog(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/");
  const entry = id ? await getListenerLog(id) : null;
  if (!entry) go(next);
  await run(next, async () => {
    await destroy("listener_logs", entry.id);
    await syncListeners(entry.artist_id);
  });
}

export async function deleteInfluencer(formData: FormData) {
  const id = str(formData, "id", 80);
  const next = safePath(str(formData, "next"), "/influencers");
  if (!id || !(await getInfluencer(id))) go(next);
  await run(next, async () => { await destroy("influencers", id); });
}

export async function clearSampleDesk() {
  try {
    await clearSample();
  } catch (error) {
    console.error(error);
    go("/", "Could not clear the sample desk.");
  }
  go("/");
}

function artistFields(formData: FormData, name: string) {
  const stage = oneOf(str(formData, "stage", 40), values(STAGES), "discovered");
  return {
    name,
    stage,
    priority: oneOf(str(formData, "priority", 40), values(PRIORITIES), "standard"),
    legal_name: str(formData, "legal_name", 160),
    genre: str(formData, "genre", 120),
    hometown: str(formData, "hometown", 120),
    base_city: str(formData, "base_city", 120),
    bio: str(formData, "bio", 4000),
    email: str(formData, "email", 180),
    phone: str(formData, "phone", 40),
    instagram: str(formData, "instagram", 180),
    tiktok: str(formData, "tiktok", 180),
    spotify_url: httpUrl(str(formData, "spotify_url", 400)),
    youtube: str(formData, "youtube", 180),
    website: str(formData, "website", 180),
    monthly_listeners: optInt(formData, "monthly_listeners"),
    ig_followers: optInt(formData, "ig_followers"),
    tiktok_followers: optInt(formData, "tiktok_followers"),
    image_url: mediaUrl(str(formData, "image_url", 400)),
    source: str(formData, "source", 180),
    ar_rep: str(formData, "ar_rep", 120),
    ipi: cleanIpi(str(formData, "ipi", 20)),
    interest: str(formData, "interest", 4000),
    signed_date: day(formData, "signed_date"),
  };
}

function contractFields(formData: FormData, artistId: string, title: string) {
  return {
    artist_id: artistId,
    title,
    deal_type: oneOf(str(formData, "deal_type", 40), values(DEAL_TYPES), "recording"),
    status: oneOf(str(formData, "status", 40), values(DEAL_STATUSES), "draft"),
    territory: str(formData, "territory", 120),
    term_years: (() => {
    const value = optFloat(formData, "term_years");
    return value == null || value < 0 ? null : value;
  })(),
    options: optInt(formData, "options"),
    advance_cents: dollars(formData, "advance"),
    royalty_rate: percent(formData, "royalty_rate"),
    recoupable: flag(formData, "recoupable"),
    effective_date: day(formData, "effective_date"),
    end_date: day(formData, "end_date"),
    notes: str(formData, "notes", 4000),
  };
}

function releaseFields(formData: FormData, artistId: string, title: string) {
  return {
    artist_id: artistId,
    title,
    release_type: oneOf(str(formData, "release_type", 40), values(RELEASE_TYPES), "single"),
    status: oneOf(str(formData, "status", 40), values(RELEASE_STATUSES), "idea"),
    release_date: day(formData, "release_date"),
    upc: str(formData, "upc", 40),
    catalog_no: str(formData, "catalog_no", 40),
    imprint: str(formData, "imprint", 120) ?? "FOF Records",
    distributor: str(formData, "distributor", 120),
    cover_url: mediaUrl(str(formData, "cover_url", 400)),
    budget_cents: dollars(formData, "budget"),
    notes: str(formData, "notes", 4000),
  };
}

function trackFields(formData: FormData, artistId: string, releaseId: string | null, title: string) {
  return {
    artist_id: artistId,
    release_id: releaseId,
    title,
    isrc: cleanIsrc(str(formData, "isrc", 40)),
    duration_sec: parseDuration(str(formData, "duration", 12)),
    track_number: optInt(formData, "track_number"),
    explicit: flag(formData, "explicit"),
    writers: str(formData, "writers", 400),
    writer_ipis: str(formData, "writer_ipis", 2000),
    producers: str(formData, "producers", 400),
    master_owner: str(formData, "master_owner", 160) ?? "FOF Records",
    publishing: str(formData, "publishing", 160),
    notes: str(formData, "notes", 2000),
  };
}

function projectFields(formData: FormData, artistId: string | null, name: string) {
  const releaseId = str(formData, "release_id", 80);
  return {
    artist_id: artistId,
    release_id: releaseId,
    name,
    kind: oneOf(str(formData, "kind", 40), values(PROJECT_KINDS), "other"),
    status: oneOf(str(formData, "status", 40), values(PROJECT_STATUSES), "planned"),
    budget_cents: dollars(formData, "budget"),
    spent_cents: dollars(formData, "spent"),
    start_date: day(formData, "start_date"),
    due_date: day(formData, "due_date"),
    owner: str(formData, "owner", 120),
    notes: str(formData, "notes", 4000),
  };
}

function royaltyFields(formData: FormData, artistId: string, period: string) {
  return {
    artist_id: artistId,
    release_id: str(formData, "release_id", 80),
    period,
    source: oneOf(str(formData, "source", 40), values(ROYALTY_SOURCES), "other"),
    gross_cents: dollars(formData, "gross"),
    recoup_cents: dollars(formData, "recoup"),
    notes: str(formData, "notes", 2000),
  };
}

function personFields(formData: FormData, name: string) {
  return {
    name,
    role: oneOf(str(formData, "role", 40), values(ROLES), "other"),
    company: str(formData, "company", 160),
    email: str(formData, "email", 180),
    phone: str(formData, "phone", 40),
    ipi: cleanIpi(str(formData, "ipi", 20)),
    notes: str(formData, "notes", 2000),
  };
}

function influencerFields(formData: FormData, name: string) {
  return {
    name,
    platform: oneOf(str(formData, "platform", 40), values(PLATFORMS), "instagram"),
    handle: cleanHandle(str(formData, "handle", 120)),
    profile_url: httpUrl(str(formData, "profile_url", 400)),
    email: str(formData, "email", 180),
    phone: str(formData, "phone", 40),
    followers: optInt(formData, "followers"),
    city: str(formData, "city", 120),
    niche: str(formData, "niche", 160),
    rate: str(formData, "rate", 120),
    status: oneOf(str(formData, "status", 40), values(INFLUENCER_STATUSES), "prospect"),
    notes: str(formData, "notes", 4000),
  };
}

async function logFields(formData: FormData, title: string) {
  const artistId = str(formData, "artist_id", 80);
  return {
    log_date: day(formData, "log_date") ?? today(),
    kind: oneOf(str(formData, "kind", 20), values(LOG_KINDS), "post"),
    title,
    body: str(formData, "body", 8000),
    link: httpUrl(str(formData, "link", 400)),
    platform: str(formData, "platform", 80),
    artist_id: artistId && await getArtist(artistId) ? artistId : null,
    status: oneOf(str(formData, "status", 20), ["planned", "done"], "done"),
  };
}

function labelForKind(kind: string) {
  if (kind === "promo") return "Promo";
  if (kind === "blog") return "Blog";
  if (kind === "playlist") return "Playlist";
  return "Post";
}

function cleanHandle(value: string | null) {
  if (!value) return null;
  const bare = value.replace(/^@+/, "").trim();
  return bare ? `@${bare.slice(0, 80)}` : null;
}

function cleanIsrc(value: string | null) {
  if (!value) return null;
  const code = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return code ? code.slice(0, 12) : null;
}

function cleanIpi(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits ? digits.slice(0, 11) : null;
}
