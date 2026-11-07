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
  const [localSrc, setLocalSrc] = useState(src);

  return (
    <div className="master-audio">
      {localSrc ? <audio className="master-player" controls preload="metadata" src={localSrc} /> : <p className="meta">No master audio yet.</p>}
      <label className="btn small file-btn">
        {status || (localSrc ? "Replace the master" : "Add the master")}
        <input
          type="file"
          accept=".wav,.wave,.mp3,audio/wav,audio/x-wav,audio/wave,audio/vnd.wave,audio/mpeg,audio/mp3,*/*"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!file) return;
            void saveAudio(file, trackId, setStatus, setLocalSrc);
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
    const payload = (await response.json().catch(() => null)) as { error?: string; done?: boolean; url?: string } | null;
    if (!response.ok) throw new Error(payload?.error || "Could not save that file.");
    if (part === total - 1) {
      if (!payload?.done) throw new Error("The file did not finish saving.");
      return typeof payload.url === "string" ? payload.url : "";
    }
  }
  return "";
}

async function saveCover(file: File, releaseId: string, setStatus: (value: string) => void) {
  try {
    setStatus("Making 3000×3000…");
    const blob = await squareCover(file);
    await uploadFile(blob, { kind: "cover", releaseId, mime: "image/jpeg", name: `${file.name.replace(/\.[^.]+$/, "") || "cover"}.jpg` }, setStatus);
    setStatus("Saved.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Could not save that cover.");
  }
}

async function saveAudio(file: File, trackId: string, setStatus: (value: string) => void, setLocalSrc: (value: string) => void) {
  try {
    const mime = await audioMime(file);
    if (mime !== "audio/wav" && mime !== "audio/mpeg") {
      setStatus("Use a WAV or MP3.");
      return;
    }
    const url = await uploadFile(file, { kind: "audio", trackId, mime, name: file.name || (mime === "audio/wav" ? "master.wav" : "master.mp3") }, setStatus);
    if (url) setLocalSrc(url);
    setStatus("Saved.");
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

async function audioMime(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".wav") || name.endsWith(".wave")) return "audio/wav";
  if (name.endsWith(".mp3")) return "audio/mpeg";
  const type = file.type.toLowerCase().split(";")[0].trim();
  if (type === "audio/wav" || type === "audio/x-wav" || type === "audio/wave" || type === "audio/vnd.wave" || type === "audio/x-pn-wav") return "audio/wav";
  if (type === "audio/mpeg" || type === "audio/mp3" || type === "audio/mpeg3" || type === "audio/x-mpeg" || type === "audio/x-mp3") return "audio/mpeg";
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const riff = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46;
  const wave = head[8] === 0x57 && head[9] === 0x41 && head[10] === 0x56 && head[11] === 0x45;
  if (riff && wave) return "audio/wav";
  const id3 = head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33;
  const frame = head[0] === 0xff && (head[1] & 0xe0) === 0xe0;
  if (id3 || frame) return "audio/mpeg";
  return "";
}
