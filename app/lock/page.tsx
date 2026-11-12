import { unlockDesk } from "@/lib/actions";
import { BrandLogo } from "@/components/BrandLogo";
import { SubmitButton } from "@/components/controls";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata = { title: "Locked" };

export default async function LockPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="lock-screen">
      <div className="lock-card stack">
        <form action={unlockDesk} className="stack">
          <BrandLogo className="brand-logo lock-logo" alt="FOF Records" />
          <h1>Desk code</h1>
          <p className="meta">Enter the code to open the desk.</p>
          {error ? <p className="banner">That code is wrong.</p> : null}
          <input name="code" inputMode="numeric" pattern="[0-9]*" enterKeyHint="done" autoComplete="one-time-code" maxLength={4} required aria-label="Desk code" />
          <SubmitButton label="Open" />
        </form>
        <ThemeToggle />
      </div>
    </main>
  );
}
