"use client";

import { useTransition } from "react";
import { acceptInvite } from "@/actions/invites";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={pending}
      className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
      onClick={() => {
        startTransition(async () => {
          const result = await acceptInvite(token);
          if (result?.error) {
            alert(result.error);
          }
        });
      }}
    >
      {pending ? "Entrando…" : "Entrar na academia"}
    </Button>
  );
}
