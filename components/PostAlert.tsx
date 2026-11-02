"use client";

import { useEffect, useState } from "react";

export function PostAlert({ titles }: { titles: string[] }) {
  const [permission, setPermission] = useState<NotificationPermission | "missing">("default");

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPermission("missing");
      return;
    }
    setPermission(Notification.permission);
    if (Notification.permission !== "granted" || titles.length === 0) return;
    const key = titles.join("|");
    if (sessionStorage.getItem("fof-post-alert") === key) return;
    sessionStorage.setItem("fof-post-alert", key);
    for (const title of titles) {
      new Notification("Post due", { body: title });
    }
  }, [titles]);

  if (permission === "missing" || permission === "granted" || titles.length === 0) return null;

  return (
    <button
      className="btn small"
      type="button"
      onClick={() => {
        if (typeof Notification === "undefined") return;
        void Notification.requestPermission().then((next) => {
          setPermission(next);
          if (next === "granted") {
            for (const title of titles) new Notification("Post due", { body: title });
          }
        });
      }}
    >
      Notify me
    </button>
  );
}
