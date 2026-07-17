import { PushReminderToggle } from "@/components/profile/push-reminder-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

export function ProfilePreferences({
  push,
}: {
  push: {
    configured: boolean;
    publicKey: string | null;
    subscribed: boolean;
  } | null;
}) {
  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="text-sm font-semibold text-foreground">Preferências</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Notificações e aparência do app.
        </p>
      </div>

      {push ? (
        <PushReminderToggle
          configured={push.configured}
          publicKey={push.publicKey}
          initialSubscribed={push.subscribed}
        />
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl">
        <p className="mb-3 text-xs font-medium text-muted-foreground">
          Aparência
        </p>
        <ThemeToggle />
      </div>
    </section>
  );
}
