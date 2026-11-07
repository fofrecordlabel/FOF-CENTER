"use client";

import { useState } from "react";
import { setReleaseDistributor, setReleaseStatus } from "@/lib/actions";
import { DISTRIBUTORS, RELEASE_STATUSES, statusTone } from "@/lib/labels";

export function ReleaseStatus({ id, status, next }: { id: string; status: string; next: string }) {
  const initial = RELEASE_STATUSES.some((item) => item.value === status) ? status : "idea";
  const [current, setCurrent] = useState(initial);
  return (
    <form action={setReleaseStatus} className="mark-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="next" value={next} />
      <select
        name="status"
        defaultValue={current}
        className={`status-pick ${statusTone(current)}`}
        aria-label="Release status"
        onChange={(event) => {
          const value = event.currentTarget.value;
          setCurrent(value);
          const row = event.currentTarget.closest("tr");
          if (row) row.className = statusTone(value);
          event.currentTarget.form?.requestSubmit();
        }}
      >
        {RELEASE_STATUSES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </form>
  );
}

export function DistributorPick({ id, distributor, next }: { id: string; distributor: string | null; next: string }) {
  const known = DISTRIBUTORS.some((item) => item.value === distributor);
  const [adding, setAdding] = useState(false);
  if (adding) {
    return (
      <form action={setReleaseDistributor} className="distributor-add">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="next" value={next} />
        <input name="distributor" placeholder="Distributor name" aria-label="New distributor" required maxLength={120} />
        <button className="btn small primary" type="submit">
          Save
        </button>
        <button className="btn small" type="button" onClick={() => setAdding(false)}>
          Cancel
        </button>
      </form>
    );
  }
  return (
    <form action={setReleaseDistributor} className="mark-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="next" value={next} />
      <select
        key={distributor ?? ""}
        name="distributor"
        defaultValue={distributor ?? ""}
        className="distributor-pick"
        aria-label="Distributor"
        onChange={(event) => {
          if (event.currentTarget.value === "__add") {
            setAdding(true);
            return;
          }
          event.currentTarget.form?.requestSubmit();
        }}
      >
        <option value="">No distributor</option>
        {DISTRIBUTORS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
        {distributor && !known ? <option value={distributor}>{distributor}</option> : null}
        <option value="__add">Add a distributor</option>
      </select>
    </form>
  );
}
