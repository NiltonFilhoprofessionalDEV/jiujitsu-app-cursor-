"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { closeSession, type SessionActionState } from "@/actions/sessions";
import { Button } from "@/components/ui/button";

const initialState: SessionActionState = null;

export function CloseSessionButton({ sessionId }: { sessionId: string }) {
  const [state, formAction, pending] = useActionState(
    closeSession,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <Button
        type="submit"
        disabled={pending}
        variant="outline"
        className="h-11 w-full border-white/15 bg-white/5"
      >
        {pending ? "Encerrando…" : "Encerrar aula"}
      </Button>
    </form>
  );
}
