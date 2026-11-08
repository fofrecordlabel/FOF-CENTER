"use client";

import { useState } from "react";
import { setReleaseDistributor, setReleaseStatus } from "@/lib/actions";
import { DISTRIBUTORS, RELEASE_STATUSES, sheetClass, statusTone } from "@/lib/labels";

export function ReleaseStatus({ id, status, next }: { id: string; status: string; next: string }) {
  const initial = RELEASE_STATUSES.some((item) => item.value === status) ? status : "idea";
  const [current, setCurrent] = useState(initial);
  return (
    <select
      name="status"
      value={current}
      className={`status-pick ${statusTone(current)}`}
      aria-label="Release status"
      onChange={(event) => {
        const value = event.currentTarget.value;
        setCurrent(value);
        paintRelease(event.currentTarget, value);
        const data = new FormData();
        data.set("id", id);
        data.set("next", next);
        data.set("status", value);
        void setReleaseStatus(data);
      }}
    >
      {RELEASE_STATUSES.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

function paintRelease(node: HTMLElement, status: string) {
  const row = node.closest("tr");
  if (row) row.className = statusTone(status);
  const sheet = node.closest("section.sheet");
  if (sheet) sheet.className = sheetClass(status);
  const ring = (row ?? node.closest("section"))?.querySelector(".cover-ring");
  if (ring) ring.className = `cover-ring ${statusTone(status)}`;
  mirrorField("status", status);
}

function mirrorField(name: string, value: string) {
  document.querySelectorAll<HTMLSelectElement>(`form select[name="${name}"]`).forEach((select) => {
    if (select.classList.contains("status-pick") || select.classList.contains("distributor-pick")) return;
    if (value && ![...select.options].some((option) => option.value === value)) {
      select.add(new Option(value, value), select.options[0] ?? null);
    }
    select.value = value;
    [...select.options].forEach((option) => {
      option.defaultSelected = option.value === value;
    });
  });
  if (name === "distributor") {
    document.querySelectorAll<HTMLInputElement>('form input[name="distributor_custom"]').forEach((input) => {
      input.value = "";
      input.defaultValue = "";
    });
  }
}

export function DistributorPick({ id, distributor, next }: { id: string; distributor: string | null; next: string }) {
  const [current, setCurrent] = useState(distributor ?? "");
  const [adding, setAdding] = useState(false);
  const known = DISTRIBUTORS.some((item) => item.value === current);

  function save(value: string) {
    setCurrent(value);
    mirrorField("distributor", value);
    const data = new FormData();
    data.set("id", id);
    data.set("next", next);
    data.set("distributor", value);
    void setReleaseDistributor(data);
  }

  if (adding) {
    return (
      <form
        className="distributor-add"
        onSubmit={(event) => {
          event.preventDefault();
          const field = event.currentTarget.elements.namedItem("distributor");
          const value = field instanceof HTMLInputElement ? field.value.trim() : "";
          if (!value) return;
          setAdding(false);
          save(value);
        }}
      >
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
    <select
      name="distributor"
      value={current}
      className="distributor-pick"
      aria-label="Distributor"
      onChange={(event) => {
        const value = event.currentTarget.value;
        if (value === "__add") {
          setAdding(true);
          return;
        }
        save(value);
      }}
    >
      <option value="">No distributor</option>
      {DISTRIBUTORS.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
      {current && !known ? <option value={current}>{current}</option> : null}
      <option value="__add">Add a distributor</option>
    </select>
  );
}
