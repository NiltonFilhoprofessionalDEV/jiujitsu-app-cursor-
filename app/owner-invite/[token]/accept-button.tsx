"use client";

import { useActionState } from "react";
import { acceptOwnerInvite } from "@/actions/owner-invites";
import { Button } from "@/components/ui/button";

export function AcceptOwnerInviteButton({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    async () => acceptOwnerInvite(token),
    null as { error?: string } | null,
  );

  return (
    <form action={formAction} className="space-y-3">
      {state?.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {pending ? "Liberando…" : "Aceitar e criar academia"}
      </Button>
    </form>
  );
}
