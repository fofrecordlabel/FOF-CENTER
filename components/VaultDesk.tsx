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
      onDragEnter={(event) => {
        event.preventDefault();
        if (!busy) setOver(true);
      }}
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
        <strong>{busy ? "Saving…" : "Add pictures"}</strong>
        <span>Tap here to choose photos, screenshots, or PDFs. You can also drop them in.</span>
        <input
          type="file"
          multiple
          accept="image/*,application/pdf,.pdf,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif"
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
  const ready = await readyFile(file);
  if (!ready.size) throw new Error("That file is empty.");
  if (ready.size > MAX_BYTES) throw new Error("That file is over 25 MB.");
  const id = crypto.randomUUID();
  const total = Math.max(1, Math.ceil(ready.size / CHUNK));
  let sent = 0;
  for (let part = 0; part < total; part += 1) {
    const start = part * CHUNK;
    const slice = ready.slice(start, Math.min(ready.size, start + CHUNK));
    onProgress(Math.min(99, Math.round((sent / ready.size) * 100)));
    const body = new FormData();
    body.set("id", id);
    body.set("part", String(part));
    body.set("total", String(total));
    body.set("name", ready.name);
    body.set("title", fileTitle(ready.name));
    body.set("category", category);
    if (notes.trim()) body.set("notes", notes.trim());
    body.set("file", slice, ready.name);
    const payload = await postChunk(body, (loaded) => {
      onProgress(Math.min(99, Math.round(((sent + Math.min(slice.size, loaded)) / ready.size) * 100)));
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

async function readyFile(file: File) {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (knownFile(head)) return file;
  const blob = await drawJpeg(file);
  const base = file.name.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "").trim() || "picture";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

async function drawJpeg(file: File) {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Could not read that picture.");
  }
  const max = 4096;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that picture.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("Could not read that picture.");
  return blob;
}

function knownFile(bytes: Uint8Array) {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return true;
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return true;
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) return true;
  return false;
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
