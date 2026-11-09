"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const down = /postgres|connect|ECONN|57P|space left|administrator command/i.test(error.message);
  return (
    <div className="empty">
      <h1>{down ? "The desk is offline" : "This page did not load"}</h1>
      <p>{down ? "The database is full. After Supabase Pro is on, the songs and WAV files come back." : "Try this page again."}</p>
      <button className="btn primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
