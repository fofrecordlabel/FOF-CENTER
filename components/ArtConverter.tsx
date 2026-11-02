"use client";

import { useRef, useState } from "react";

const SIZE = 3000;

type Mode = "cover" | "contain";

export function ArtConverter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fileName, setFileName] = useState("cover");
  const [mode, setMode] = useState<Mode>("cover");
  const [background, setBackground] = useState("#000000");
  const [source, setSource] = useState<{ width: number; height: number; name: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const imageRef = useRef<HTMLImageElement | null>(null);

  function paint(image: HTMLImageElement, nextMode: Mode, nextBackground: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    canvas.width = SIZE;
    canvas.height = SIZE;
    context.fillStyle = nextBackground;
    context.fillRect(0, 0, SIZE, SIZE);
    const scale = nextMode === "cover" ? Math.max(SIZE / image.width, SIZE / image.height) : Math.min(SIZE / image.width, SIZE / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, (SIZE - width) / 2, (SIZE - height) / 2, width, height);
    setReady(true);
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("That file is not an image.");
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      const base = file.name.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-") || "cover";
      setFileName(base);
      setSource({ width: image.width, height: image.height, name: file.name });
      const soft = image.width < SIZE || image.height < SIZE;
      setMessage(soft ? "This image is smaller than 3000 pixels on a side. The export will be 3000×3000, and it may look soft." : "Ready. Export is a square 3000×3000 file.");
      paint(image, mode, background);
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      setMessage("Could not read that image.");
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  function redraw(nextMode: Mode, nextBackground: string) {
    setMode(nextMode);
    setBackground(nextBackground);
    if (imageRef.current) paint(imageRef.current, nextMode, nextBackground);
  }

  function download(kind: "jpeg" | "png") {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const type = kind === "jpeg" ? "image/jpeg" : "image/png";
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const link = document.createElement("a");
        const objectUrl = URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `${fileName}-3000x3000.${kind === "jpeg" ? "jpg" : "png"}`;
        link.click();
        URL.revokeObjectURL(objectUrl);
      },
      type,
      0.95
    );
  }

  return (
    <div className="art-stage">
      <div className="stack">
        <canvas ref={canvasRef} width={SIZE} height={SIZE} className="art-canvas" />
        <p className="meta">{source ? `${source.name} · ${source.width}×${source.height} in` : "No file yet"} · 3000×3000 out</p>
      </div>
      <div className="card stack">
        <h2>Make the square</h2>
        <p className="meta">Distributors take a square 3000×3000 RGB file. Fill crops to the center. Fit keeps the whole picture and pads the edges.</p>
        <label className="drop">
          <span className="kicker">Image</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => onFile(event.currentTarget.files?.[0])}
          />
        </label>
        <label className="field">
          <span>File name</span>
          <input value={fileName} onChange={(event) => setFileName(event.target.value)} />
        </label>
        <div className="actions">
          <button type="button" className={mode === "cover" ? "btn primary" : "btn"} onClick={() => redraw("cover", background)}>
            Fill
          </button>
          <button type="button" className={mode === "contain" ? "btn primary" : "btn"} onClick={() => redraw("contain", background)}>
            Fit
          </button>
          <label className="btn">
            Pad color
            <input
              type="color"
              value={background}
              aria-label="Pad color"
              onChange={(event) => redraw(mode, event.target.value)}
              style={{ width: 36, padding: 0, border: 0, background: "transparent" }}
            />
          </label>
        </div>
        {message ? <p className="meta">{message}</p> : null}
        <div className="actions">
          <button type="button" className="btn primary" disabled={!ready} onClick={() => download("jpeg")}>
            Download JPEG
          </button>
          <button type="button" className="btn" disabled={!ready} onClick={() => download("png")}>
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
