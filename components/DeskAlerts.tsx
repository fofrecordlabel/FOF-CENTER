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

  const visible = alerts.filter((alert) => alert.at == null || alert.at <= Date.now());
  if (visible.length === 0) return null;

  return (
    <section className="alert-stack" aria-label="Alerts">
      {visible.map((alert) => (
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
  const now = Date.now();
  for (const alert of alerts) {
    const key = `fof-alert:${day}:${alert.id}`;
    if (localStorage.getItem(key)) continue;
    if (alert.at != null && alert.at > now + 15000) {
      const host = globalThis as { TimestampTrigger?: new (when: number) => unknown; fofPostTimers?: Set<string> };
      const armed = `fof-armed:${day}:${alert.id}`;
      if (host.TimestampTrigger && !localStorage.getItem(armed)) {
        try {
          await registration.showNotification(alert.title, {
            body: alert.detail,
            icon: "/apple-touch-icon.png",
            tag: key,
            data: { href: alert.href },
            showTrigger: new host.TimestampTrigger(alert.at),
          } as NotificationOptions);
          localStorage.setItem(armed, "1");
          continue;
        } catch {
          localStorage.removeItem(armed);
        }
      } else if (localStorage.getItem(armed)) {
        continue;
      }
      const timers = host.fofPostTimers ?? new Set<string>();
      host.fofPostTimers = timers;
      if (timers.has(key)) continue;
      timers.add(key);
      window.setTimeout(() => {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, "1");
        void registration.showNotification(alert.title, {
          body: alert.detail,
          icon: "/apple-touch-icon.png",
          tag: key,
          data: { href: alert.href },
        });
      }, alert.at - Date.now());
      continue;
    }
    if (alert.at != null && now - alert.at > 30 * 60 * 1000) continue;
    localStorage.setItem(key, "1");
    try {
      await registration.showNotification(alert.title, {
        body: alert.detail,
        icon: "/apple-touch-icon.png",
        tag: key,
        data: { href: alert.href },
      });
    } catch {
      registration.active?.postMessage({ type: "alert", title: alert.title, detail: alert.detail, href: alert.href });
    }
  }
}
