"use client";

import { useEffect, useRef, useState } from "react";

const STOP = "fof-master-stop";

export function ReleasePlay({
  releaseId,
  title,
  tracks,
}: {
  releaseId: string;
  title: string;
  tracks: { title: string; src: string }[];
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const track = tracks[index];

  useEffect(() => {
    const onStop = (event: Event) => {
      if ((event as CustomEvent<string>).detail === releaseId) return;
      audioRef.current?.pause();
      setPlaying(false);
    };
    window.addEventListener(STOP, onStop);
    return () => {
      window.removeEventListener(STOP, onStop);
      audioRef.current?.pause();
    };
  }, [releaseId]);

  useEffect(() => {
    const audio = audioRef.current;
    const src = tracks[index]?.src;
    if (!audio || !src || !playing) return;
    if (audio.getAttribute("src") !== src) audio.src = src;
    void audio.play();
  }, [index, playing, tracks]);

  if (!track) return null;

  const label = tracks.length > 1 ? `${title}, ${track.title}` : title;

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    window.dispatchEvent(new CustomEvent(STOP, { detail: releaseId }));
    setPlaying(true);
  }

  return (
    <div className="release-play">
      <button
        type="button"
        className={playing ? "play-btn on" : "play-btn"}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        onClick={toggle}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <audio
        ref={audioRef}
        preload="none"
        src={track.src}
        onError={() => setPlaying(false)}
        onEnded={() => {
          if (index + 1 < tracks.length) {
            setIndex(index + 1);
            return;
          }
          setPlaying(false);
          setIndex(0);
        }}
      />
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.2 1.1v9.8L10.8 6z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <rect x="1.4" y="1.2" width="3" height="9.6" fill="currentColor" />
      <rect x="7.6" y="1.2" width="3" height="9.6" fill="currentColor" />
    </svg>
  );
}
