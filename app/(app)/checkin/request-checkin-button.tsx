"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  requestCheckin,
  type AttendanceActionState,
} from "@/actions/attendance";
import { Button } from "@/components/ui/button";

const initialState: AttendanceActionState = null;

export function RequestCheckinButton({ sessionId }: { sessionId: string }) {
  const [state, formAction, pending] = useActionState(
    requestCheckin,
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
        className="h-10 w-full bg-[var(--accent)] text-black hover:bg-[var(--accent)]/90"
      >
        {pending ? "Enviando…" : "Registrar presença"}
      </Button>
      {state?.error ? (
        <p
          role="alert"
          className="mt-2 text-xs text-destructive"
        >
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="mt-2 text-xs text-emerald-400">{state.success}</p>
      ) : null}
    </form>
  );
}
