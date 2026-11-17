"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { VAULT_CATEGORIES } from "@/lib/labels";

const CHUNK = 480 * 1024;
const MAX_BYTES = 25 * 1024 * 1024;

type Job = { id: string; name: string; percent: number; error: string };

export function VaultDrop({ category }: { category: string }) {
  const router = useRouter();
  const [folder, setFolder] = useState(category);
  const [note, setNote] = useState("");
  useEffect(() => {
    setFolder(category);
  }, [category]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const lock = useRef(false);

  async function take(list: FileList | File[] | null) {
    const files = [...(list ?? [])];
    if (!files.length || lock.current) return;
    lock.current = true;
    setBusy(true);
    const next = files.map((file) => ({ id: crypto.randomUUID(), name: file.name, percent: 0, error: "" }));
    setJobs(next);
    const saved: string[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const job = next[index];
      try {
        const url = await sendFile(file, folder, note, (percent) => {
          setJobs((current) => current.map((item) => (item.id === job.id ? { ...item, percent } : item)));
        });
        saved.push(url);
        setJobs((current) => current.map((item) => (item.id === job.id ? { ...item, percent: 100 } : item)));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not save that file.";
        setJobs((current) => current.map((item) => (item.id === job.id ? { ...item, error: message } : item)));
      }
    }
    lock.current = false;
    setBusy(false);
    if (saved.length === 1 && saved.length === files.length) {
      router.push(saved[0]);
      return;
    }
    if (saved.length) router.refresh();
  }

  return (
    <section
      className={over ? "vault-drop over" : "vault-drop"}
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        void take(event.dataTransfer.files);
      }}
    >
      <label className="vault-pick">
        <strong>{busy ? "Saving…" : "Drop files here"}</strong>
        <span>PDFs and pictures. Tap to choose more than one.</span>
        <input
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif"
          disabled={busy}
          onChange={(event) => {
            const chosen = event.currentTarget.files;
            event.currentTarget.value = "";
            void take(chosen);
          }}
        />
      </label>
      <div className="form-grid">
        <label className="field">
          <span>Save into</span>
          <select value={folder} disabled={busy} onChange={(event) => setFolder(event.currentTarget.value)}>
            {VAULT_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Note</span>
          <input value={note} disabled={busy} placeholder="Optional, for this drop" onChange={(event) => setNote(event.currentTarget.value)} />
        </label>
      </div>
      {jobs.length ? (
        <ul className="vault-jobs">
          {jobs.map((job) => (
            <li key={job.id}>
              <span>{job.name}</span>
              {job.error ? <em>{job.error}</em> : <b>{job.percent}%</b>}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

async function sendFile(file: File, category: string, notes: string, onProgress: (percent: number) => void) {
  if (!file.size) throw new Error("That file is empty.");
  if (file.size > MAX_BYTES) throw new Error("That file is over 25 MB.");
  if (/\.(heic|heif)$/i.test(file.name) || file.type === "image/heic" || file.type === "image/heif") {
    throw new Error("Save that screenshot as a JPEG or PNG.");
  }
  const id = crypto.randomUUID();
  const total = Math.max(1, Math.ceil(file.size / CHUNK));
  let sent = 0;
  for (let part = 0; part < total; part += 1) {
    const start = part * CHUNK;
    const slice = file.slice(start, Math.min(file.size, start + CHUNK));
    onProgress(Math.min(99, Math.round((sent / file.size) * 100)));
    const body = new FormData();
    body.set("id", id);
    body.set("part", String(part));
    body.set("total", String(total));
    body.set("name", file.name);
    body.set("title", fileTitle(file.name));
    body.set("category", category);
    if (notes.trim()) body.set("notes", notes.trim());
    body.set("file", slice, file.name);
    const payload = await postChunk(body, (loaded) => {
      onProgress(Math.min(99, Math.round(((sent + Math.min(slice.size, loaded)) / file.size) * 100)));
    });
    if (part === total - 1) {
      if (!payload?.done || typeof payload.url !== "string") throw new Error("The file did not finish saving.");
      onProgress(100);
      return payload.url;
    }
    sent += slice.size;
  }
  throw new Error("The file did not finish saving.");
}

function fileTitle(name: string) {
  const base = name.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base.slice(0, 180) || "Untitled";
}

function postChunk(body: FormData, onLoaded: (bytes: number) => void) {
  return new Promise<{ error?: string; done?: boolean; url?: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/vault");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onLoaded(event.loaded);
    };
    xhr.onload = () => {
      const payload = readPayload(xhr);
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(payload?.error || "Could not save that file."));
        return;
      }
      resolve(payload ?? {});
    };
    xhr.onerror = () => reject(new Error("Could not save that file."));
    xhr.send(body);
  });
}

function readPayload(xhr: XMLHttpRequest) {
  try {
    return JSON.parse(String(xhr.responseText || "")) as { error?: string; done?: boolean; url?: string };
  } catch {
    return null;
  }
}
