"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

type Snap = Record<string, string>;

export function DraftKeeper() {
  const pathname = usePathname();
  const params = useSearchParams();
  const saved = params.get("saved");

  useEffect(() => {
    if (saved === "1") {
      const submitted = sessionStorage.getItem("fof-submitted-draft");
      if (submitted) localStorage.removeItem(submitted);
      else clearDrafts(pathname);
      sessionStorage.removeItem("fof-submitted-draft");
    }

    const cleanups: Array<() => void> = [];
    const seen = new WeakSet<HTMLFormElement>();

    function scan() {
      document.querySelectorAll("form").forEach((node) => {
        const form = node as HTMLFormElement;
        if (seen.has(form)) return;
        seen.add(form);
        const stop = bind(form);
        if (stop) cleanups.push(stop);
      });
    }

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cleanups.forEach((stop) => stop());
    };
  }, [pathname, saved]);

  return null;
}

function bind(form: HTMLFormElement) {
  if (form.method === "get" || form.classList.contains("compact-form")) return null;
  const server = snapshot(form);
  if (Object.keys(server).length === 0) return null;

  const key = draftKey(form);
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      apply(form, JSON.parse(raw) as Snap);
    } catch {
      localStorage.removeItem(key);
    }
  }

  let timer = 0;
  const save = () => {
    const current = snapshot(form);
    if (same(current, server)) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(current));
  };
  const onEdit = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(save, 150);
  };
  const onSubmit = () => sessionStorage.setItem("fof-submitted-draft", key);
  form.addEventListener("input", onEdit);
  form.addEventListener("change", onEdit);
  form.addEventListener("submit", onSubmit);
  return () => {
    window.clearTimeout(timer);
    form.removeEventListener("input", onEdit);
    form.removeEventListener("change", onEdit);
    form.removeEventListener("submit", onSubmit);
  };
}

function formKey(form: HTMLFormElement) {
  const id =
    field(form, "id") ||
    field(form, "artist_id") ||
    field(form, "track_id") ||
    field(form, "release_id") ||
    field(form, "campaign_id") ||
    "new";
  const names = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[name]")]
    .map((el) => el.name)
    .filter((name) => name && name !== "next" && name !== "stay")
    .filter((name, index, all) => all.indexOf(name) === index)
    .sort()
    .join(".");
  return `fof-draft:${location.pathname}:${id}:${names}`;
}

function draftKey(form: HTMLFormElement) {
  const base = formKey(form);
  const twins = [...document.querySelectorAll("form")].filter((node) => formKey(node as HTMLFormElement) === base);
  const index = twins.indexOf(form);
  return index > 0 ? `${base}:${index}` : base;
}

function field(form: HTMLFormElement, name: string) {
  const el = form.querySelector<HTMLInputElement>(`input[name="${CSS.escape(name)}"]`);
  return el?.value || "";
}

function snapshot(form: HTMLFormElement): Snap {
  const data: Snap = {};
  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input[name], textarea[name], select[name]").forEach((el) => {
    if (el instanceof HTMLInputElement && (el.type === "hidden" || el.type === "file" || el.type === "submit")) return;
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      data[el.name] = el.checked ? el.value || "1" : "";
      return;
    }
    if (el instanceof HTMLInputElement && el.type === "radio") {
      if (el.checked) data[el.name] = el.value;
      else if (!(el.name in data)) data[el.name] = "";
      return;
    }
    data[el.name] = el.value;
  });
  return data;
}

function apply(form: HTMLFormElement, data: Snap) {
  for (const [name, value] of Object.entries(data)) {
    if (typeof value !== "string") continue;
    form.querySelectorAll(`[name="${CSS.escape(name)}"]`).forEach((node) => {
      if (node instanceof HTMLInputElement && node.type === "checkbox") {
        node.checked = value === (node.value || "1");
        return;
      }
      if (node instanceof HTMLInputElement && node.type === "radio") {
        node.checked = node.value === value;
        return;
      }
      if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) {
        node.value = value;
      }
    });
  }
}

function same(left: Snap, right: Snap) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if ((left[key] ?? "") !== (right[key] ?? "")) return false;
  }
  return true;
}

function clearDrafts(pathname: string) {
  const prefix = `fof-draft:${pathname}:`;
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix)) localStorage.removeItem(key);
  }
}
