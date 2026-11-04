"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function SavedNotice() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const saved = params.get("saved") === "1";

  useEffect(() => {
    if (!saved) return;
    setTick((value) => value + 1);
    const next = new URLSearchParams(params.toString());
    next.delete("saved");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [saved, params, pathname, router]);

  useEffect(() => {
    if (!tick) return;
    const timer = window.setTimeout(() => setTick(0), 2600);
    return () => window.clearTimeout(timer);
  }, [tick]);

  if (!tick) return null;
  return (
    <p className="saved-note" role="status">
      Saved on the desk.
    </p>
  );
}
