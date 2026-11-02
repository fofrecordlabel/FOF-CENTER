"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="empty">
      <h1>The desk hit an error</h1>
      <p>{error.message}</p>
      <button className="btn primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
