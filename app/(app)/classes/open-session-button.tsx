"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { openSession, type SessionActionState } from "@/actions/sessions";
import { Button } from "@/components/ui/button";

const initialState: SessionActionState = null;

export function OpenSessionButton({ classId }: { classId: string }) {
  const [state, formAction, pending] = useActionState(
    openSession,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="classId" value={classId} />
      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full bg-[var(--action-red)] text-primary-foreground hover:bg-[var(--action-red)]/90"
      >
        {pending ? "Abrindo…" : "Abrir aula"}
      </Button>
      {state?.error ? (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
