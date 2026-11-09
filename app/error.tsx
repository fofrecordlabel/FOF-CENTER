"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="empty">
      <h1>This page did not load</h1>
      <p>Try this page again.</p>
      <button className="btn primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
