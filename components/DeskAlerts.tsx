"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DeskAlert } from "@/lib/alerts";

export function DeskAlerts({ alerts, day }: { alerts: DeskAlert[]; day: string }) {
  const [permission, setPermission] = useState<NotificationPermission | "missing">("default");

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setPermission("missing");
      return;
    }
    setPermission(Notification.permission);
    if (Notification.permission === "granted") void pushAlerts(alerts, day);
  }, [alerts, day]);

  if (alerts.length === 0) return null;

  return (
    <section className="alert-stack" aria-label="Alerts">
      {alerts.map((alert) => (
        <Link className="alert-card" href={alert.href} key={alert.id}>
          <strong>{alert.title}</strong>
          <span>{alert.detail}</span>
        </Link>
      ))}
      {permission === "default" ? (
        <button
          className="btn"
          type="button"
          onClick={() => {
            void Notification.requestPermission().then((next) => {
              setPermission(next);
              if (next === "granted") void pushAlerts(alerts, day);
            });
          }}
        >
          Turn on phone alerts
        </button>
      ) : null}
      {permission === "denied" ? <p className="meta">Phone alerts are blocked. Allow notifications for this site in the browser.</p> : null}
      {permission === "granted" ? <p className="meta">Phone alerts are on. Add FOF to your home screen so they can arrive when the desk is closed.</p> : null}
    </section>
  );
}

async function pushAlerts(alerts: DeskAlert[], day: string) {
  if (!("serviceWorker" in navigator) || alerts.length === 0) return;
  await navigator.serviceWorker.register("/alerts.js");
  const registration = await navigator.serviceWorker.ready;
  for (const alert of alerts) {
    const key = `fof-alert:${day}:${alert.id}`;
    if (localStorage.getItem(key)) continue;
    localStorage.setItem(key, "1");
    try {
      await registration.showNotification(alert.title, {
        body: alert.detail,
        icon: "/brand/fof.png",
        data: { href: alert.href },
      });
    } catch {
      registration.active?.postMessage({ type: "alert", title: alert.title, detail: alert.detail, href: alert.href });
    }
  }
}
