"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { openSession, type SessionActionState } from "@/actions/sessions";
import { Button } from "@/components/ui/button";

const initialState: SessionActionState = null;

export function OpenSessionButton({ classId }: { classId: string }) {
  const [state, formAction, pending] = useActionState(
    openSession,
    initialState,
  );
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    if (state?.error) {
      setNavigating(false);
      toast.error(state.error);
    }
    if (state?.success) toast.success(state.success);
    // Hard navigation evita Failed to fetch do soft-nav (push+refresh).
    if (state?.redirectTo && !navigating) {
      setNavigating(true);
      window.location.assign(state.redirectTo);
    }
  }, [state, navigating]);

  return (
    <form action={formAction}>
      <input type="hidden" name="classId" value={classId} />
      <Button
        type="submit"
        disabled={pending || navigating}
        className="h-12 w-full bg-[var(--action-red)] text-base font-semibold text-primary-foreground hover:bg-[var(--action-red)]/90"
      >
        {pending || navigating ? "Abrindo…" : "Abrir aula"}
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
