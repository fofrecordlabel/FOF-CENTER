"use client";

import { useFormStatus } from "react-dom";
import { setStage } from "@/lib/actions";
import { STAGES } from "@/lib/labels";

export function SubmitButton({ label, pendingLabel = "Saving…", className = "btn primary" }: { label: string; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function ConfirmSubmit({ label, message, className }: { label: string; message: string; className?: string }) {
  return (
    <button
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {label}
    </button>
  );
}

export function StageSelect({ id, stage }: { id: string; stage: string }) {
  return (
    <form action={setStage} className="compact-form">
      <input type="hidden" name="id" value={id} />
      <select
        key={stage}
        name="stage"
        defaultValue={stage}
        aria-label="Stage"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {STAGES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </form>
  );
}
