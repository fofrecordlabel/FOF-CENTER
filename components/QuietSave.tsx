"use client";

import { useEffect, useState } from "react";

export function QuietSave() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const response = await original(input, init);
      try {
        if (!hasAction(input, init) || !response.ok || response.headers.get("x-action-redirect")) return response;
        const key = sessionStorage.getItem("fof-submitted-draft");
        if (key) localStorage.removeItem(key);
        sessionStorage.removeItem("fof-submitted-draft");
        document.querySelector<HTMLFormElement>("form[data-fof-saving]")?.removeAttribute("data-fof-saving");
        setTick((value) => value + 1);
      } catch {
        return response;
      }
      return response;
    };

    const onSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.method.toLowerCase() === "get") return;
      document.querySelectorAll<HTMLFormElement>("form[data-fof-saving]").forEach((node) => node.removeAttribute("data-fof-saving"));
      form.dataset.fofSaving = "1";
      pin(form);
    };
    document.addEventListener("submit", onSubmit, true);
    return () => {
      window.fetch = original;
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  useEffect(() => {
    if (!tick) return;
    const timer = window.setTimeout(() => setTick(0), 2200);
    return () => window.clearTimeout(timer);
  }, [tick]);

  if (!tick) return null;
  return (
    <p className="saved-note toast" role="status">
      Saved.
    </p>
  );
}

function hasAction(input: RequestInfo | URL, init?: RequestInit) {
  const bags = [init?.headers, input instanceof Request ? input.headers : undefined];
  return bags.some((bag) => {
    if (!bag) return false;
    if (bag instanceof Headers) return bag.has("next-action");
    if (Array.isArray(bag)) return bag.some((entry) => String(entry?.[0] ?? "").toLowerCase() === "next-action");
    return Object.keys(bag).some((key) => key.toLowerCase() === "next-action");
  });
}

function pin(form: HTMLFormElement) {
  const id = form.querySelector<HTMLInputElement>('input[name="id"]');
  if (!id?.value) return;
  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input[name], textarea[name], select[name]").forEach((el) => {
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      el.defaultChecked = el.checked;
      return;
    }
    if (el instanceof HTMLSelectElement) {
      [...el.options].forEach((option) => {
        option.defaultSelected = option.selected;
      });
      return;
    }
    el.defaultValue = el.value;
  });
}
