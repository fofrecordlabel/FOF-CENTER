"use client";

import { useState } from "react";

const SIZE = 3000;
const CHUNK = 480 * 1024;

export function CoverUpload({ releaseId }: { releaseId: string }) {
  const [status, setStatus] = useState("");

  return (
    <label className="btn small file-btn">
      {status || "Upload cover"}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          void saveCover(file, releaseId, setStatus);
        }}
      />
    </label>
  );
}

export function MasterAudio({ trackId, src }: { trackId: string; src: string | null }) {
  const [status, setStatus] = useState("");

  return (
    <div className="master-audio">
      {src ? <audio className="master-player" controls preload="metadata" src={src} /> : <p className="meta">No master audio yet.</p>}
      <label className="btn small file-btn">
        {status || (src ? "Replace the master" : "Add the master")}
        <input
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.aac,.flac,.aiff"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!file) return;
            void saveAudio(file, trackId, setStatus);
          }}
        />
      </label>
    </div>
  );
}

export async function uploadFile(file: Blob, fields: { kind: "cover" | "audio"; releaseId?: string; trackId?: string; mime: string; name: string }, onProgress?: (text: string) => void) {
  const id = crypto.randomUUID();
  const total = Math.max(1, Math.ceil(file.size / CHUNK));
  for (let part = 0; part < total; part += 1) {
    onProgress?.(`Saving ${part + 1} of ${total}`);
    const body = new FormData();
    body.set("id", id);
    body.set("part", String(part));
    body.set("total", String(total));
    body.set("kind", fields.kind);
    body.set("mime", fields.mime);
    body.set("name", fields.name);
    if (fields.releaseId) body.set("release_id", fields.releaseId);
    if (fields.trackId) body.set("track_id", fields.trackId);
    body.set("file", file.slice(part * CHUNK, (part + 1) * CHUNK), fields.name);
    const response = await fetch("/api/media", { method: "POST", body });
    const payload = (await response.json().catch(() => null)) as { error?: string; done?: boolean } | null;
    if (!response.ok) throw new Error(payload?.error || "Could not save that file.");
    if (part === total - 1 && !payload?.done) throw new Error("The file did not finish saving.");
  }
}

async function saveCover(file: File, releaseId: string, setStatus: (value: string) => void) {
  try {
    setStatus("Making 3000×3000…");
    const blob = await squareCover(file);
    await uploadFile(blob, { kind: "cover", releaseId, mime: "image/jpeg", name: `${file.name.replace(/\.[^.]+$/, "") || "cover"}.jpg` }, setStatus);
    window.location.reload();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Could not save that cover.");
  }
}

async function saveAudio(file: File, trackId: string, setStatus: (value: string) => void) {
  try {
    await uploadFile(file, { kind: "audio", trackId, mime: audioMime(file), name: file.name }, setStatus);
    window.location.reload();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Could not save that master.");
  }
}

export function squareCover(file: File) {
  return new Promise<Blob>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that image."));
        return;
      }
      context.fillStyle = "#000000";
      context.fillRect(0, 0, SIZE, SIZE);
      const scale = Math.max(SIZE / image.width, SIZE / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, (SIZE - width) / 2, (SIZE - height) / 2, width, height);
      URL.revokeObjectURL(url);
      void squeeze(canvas).then(resolve, reject);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    image.src = url;
  });
}

function squeeze(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    const attempt = (quality: number) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not make the 3000×3000 cover."));
            return;
          }
          if (blob.size > 3_500_000 && quality > 0.62) {
            attempt(quality - 0.08);
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        quality
      );
    };
    attempt(0.92);
  });
}

function audioMime(file: File) {
  if (file.type.startsWith("audio/")) return file.type === "audio/mp3" ? "audio/mpeg" : file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".mp3")) return "audio/mpeg";
  if (name.endsWith(".m4a")) return "audio/mp4";
  if (name.endsWith(".wav")) return "audio/wav";
  if (name.endsWith(".aac")) return "audio/aac";
  if (name.endsWith(".flac")) return "audio/flac";
  if (name.endsWith(".aiff") || name.endsWith(".aif")) return "audio/aiff";
  return file.type;
}
