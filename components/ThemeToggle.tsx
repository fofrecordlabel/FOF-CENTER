"use client";

import { useLayoutEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "fof-theme";

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeBoot() {
  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") applyTheme(stored);
    } catch {
      /* Keep the default dark desk if storage is unavailable. */
    }
  }, []);
  return null;
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* Storage can be blocked in private browsing. The choice still applies for this visit. */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#f3f3f1" : "#000000");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if ((stored === "light" || stored === "dark") && document.documentElement.dataset.theme !== stored) {
        applyTheme(stored);
      }
    } catch {
      /* The attribute set before paint is enough when storage cannot be read. */
    }
    const sync = () => setTheme(currentTheme());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  function choose(next: Theme) {
    applyTheme(next);
    setTheme(next);
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Appearance">
      <button type="button" aria-pressed={theme === "dark"} className={theme === "dark" ? "on" : undefined} onClick={() => choose("dark")}>
        Dark
      </button>
      <button type="button" aria-pressed={theme === "light"} className={theme === "light" ? "on" : undefined} onClick={() => choose("light")}>
        Light
      </button>
    </div>
  );
}
