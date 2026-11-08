"use client";

import { useState } from "react";
import { ReleasePlay } from "@/components/ReleasePlay";

const SIZE = 3000;
const CHUNK = 480 * 1024;
const AUDIO_ACCEPT = ".mp3,audio/mpeg,.wav,.wave,audio/wav,audio/x-wav,audio/*";

export function CoverUpload({ releaseId }: { releaseId: string }) {
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<number | null>(null);

  if (progress !== null) return <UploadMeter percent={progress} />;

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
          void saveCover(file, releaseId, setStatus, setProgress);
        }}
      />
    </label>
  );
}

export function MasterAudio({ trackId, src }: { trackId: string; src: string | null }) {
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [localSrc, setLocalSrc] = useState(src);

  return (
    <div className="master-audio">
      {localSrc ? <audio className="master-player" controls preload="metadata" src={localSrc} /> : <p className="meta">No master audio yet.</p>}
      {progress !== null ? (
        <UploadMeter percent={progress} />
      ) : (
        <label className="btn small file-btn">
          {status || (localSrc ? "Replace the master" : "Add MP3 or WAV")}
          <AudioInput
            onFile={(file) => {
              void saveAudio(file, { trackId }, setStatus, setProgress, setLocalSrc);
            }}
          />
        </label>
      )}
    </div>
  );
}

export function MasterAdd({ releaseId, trackId, title, compact = false }: { releaseId: string; trackId?: string | null; title: string; compact?: boolean }) {
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [src, setSrc] = useState("");

  if (src) return <ReleasePlay releaseId={releaseId} title={title} tracks={[{ title, src }]} />;
  if (!compact && progress !== null) return <UploadMeter percent={progress} />;

  const problem = status && progress === null ? status : "";
  const label = problem || (compact ? `Add the MP3 or WAV for ${title}` : "Add MP3 or WAV");
  const control = (
    <label className={compact ? "add-master" : "btn small file-btn"} aria-label={label} title={problem || "An MP3 is easier than a WAV."}>
      {compact ? progress !== null ? <b>{progress}%</b> : <PlusIcon /> : problem || "Add MP3 or WAV"}
      {progress === null ? (
        <AudioInput
          onFile={(file) => {
            void saveAudio(file, { releaseId, trackId: trackId ?? undefined }, setStatus, setProgress, setSrc);
          }}
        />
      ) : null}
    </label>
  );
  if (!compact) return control;
  return (
    <div className="release-play">
      {control}
      {problem ? <span className="meta">{problem}</span> : null}
    </div>
  );
}

function AudioInput({ onFile }: { onFile: (file: File) => void }) {
  return (
    <input
      type="file"
      accept={AUDIO_ACCEPT}
      onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (!file) return;
        onFile(file);
      }}
    />
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M7 2h2v12H7zM2 7h12v2H2z" fill="currentColor" />
    </svg>
  );
}

function UploadMeter({ percent }: { percent: number }) {
  return (
    <span className="upload-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={`Uploading ${percent}%`}>
      <span className="upload-spin" aria-hidden="true" />
      <span className="upload-track" aria-hidden="true">
        <i style={{ width: `${percent}%` }} />
      </span>
      <b>{percent}%</b>
    </span>
  );
}

export async function uploadFile(file: Blob, fields: { kind: "cover" | "audio"; releaseId?: string; trackId?: string; mime: string; name: string }, onProgress?: (percent: number) => void) {
  const id = crypto.randomUUID();
  const piece = fields.kind === "audio" ? 1024 * 1024 : CHUNK;
  const total = Math.max(1, Math.ceil(file.size / piece));
  let sent = 0;
  for (let part = 0; part < total; part += 1) {
    const start = part * piece;
    const slice = file.slice(start, Math.min(file.size, start + piece));
    onProgress?.(file.size ? Math.min(99, Math.round((sent / file.size) * 100)) : 0);
    const body = new FormData();
    body.set("id", id);
    body.set("part", String(part));
    body.set("total", String(total));
    body.set("kind", fields.kind);
    body.set("mime", fields.mime);
    body.set("name", fields.name);
    if (fields.releaseId) body.set("release_id", fields.releaseId);
    if (fields.trackId) body.set("track_id", fields.trackId);
    body.set("file", slice, fields.name);
    const payload = await postChunk(body, (loaded) => {
      const within = Math.min(slice.size, loaded);
      onProgress?.(file.size ? Math.min(99, Math.round(((sent + within) / file.size) * 100)) : 0);
    });
    if (part === total - 1) {
      if (!payload?.done) throw new Error("The file did not finish saving.");
      onProgress?.(100);
      return typeof payload.url === "string" ? payload.url : "";
    }
    sent += slice.size;
    onProgress?.(file.size ? Math.round((sent / file.size) * 100) : 100);
  }
  return "";
}

function postChunk(body: FormData, onLoaded: (bytes: number) => void) {
  return new Promise<{ error?: string; done?: boolean; url?: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media");
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
  const raw = xhr.response;
  if (raw && typeof raw === "object") return raw as { error?: string; done?: boolean; url?: string };
  try {
    return JSON.parse(String(xhr.responseText || "")) as { error?: string; done?: boolean; url?: string };
  } catch {
    return null;
  }
}

async function saveCover(file: File, releaseId: string, setStatus: (value: string) => void, setProgress: (value: number | null) => void) {
  try {
    setStatus("Making 3000×3000…");
    const blob = await squareCover(file);
    setStatus("");
    setProgress(0);
    await uploadFile(blob, { kind: "cover", releaseId, mime: "image/jpeg", name: `${file.name.replace(/\.[^.]+$/, "") || "cover"}.jpg` }, setProgress);
    setProgress(null);
    setStatus("Saved.");
  } catch (error) {
    setProgress(null);
    setStatus(error instanceof Error ? error.message : "Could not save that cover.");
  }
}

async function saveAudio(file: File, target: { trackId?: string; releaseId?: string }, setStatus: (value: string) => void, setProgress: (value: number | null) => void, setLocalSrc: (value: string) => void) {
  try {
    const mime = await audioMime(file);
    if (mime !== "audio/wav" && mime !== "audio/mpeg") {
      setStatus("Use an MP3 or WAV. An MP3 is easier.");
      return;
    }
    setStatus("");
    setProgress(0);
    const url = await uploadFile(
      file,
      { kind: "audio", trackId: target.trackId, releaseId: target.releaseId, mime, name: file.name || (mime === "audio/mpeg" ? "master.mp3" : "master.wav") },
      setProgress
    );
    setProgress(null);
    if (url) setLocalSrc(url);
    setStatus("Saved.");
  } catch (error) {
    setProgress(null);
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
  const rf64 = head[0] === 0x52 && head[1] === 0x46 && head[2] === 0x36 && head[3] === 0x34;
  const wave = head[8] === 0x57 && head[9] === 0x41 && head[10] === 0x56 && head[11] === 0x45;
  if ((riff || rf64) && wave) return "audio/wav";
  const id3 = head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33;
  const frame = head[0] === 0xff && (head[1] & 0xe0) === 0xe0;
  if (id3 || frame) return "audio/mpeg";
  return "";
}
