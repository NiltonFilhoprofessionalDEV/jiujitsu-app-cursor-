"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  markNotificationRead,
  type NotificationActionState,
} from "@/actions/notifications";
import { Button } from "@/components/ui/button";

const initialState: NotificationActionState = null;

export function MarkReadButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(
    markNotificationRead,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        className="h-8 text-xs text-[var(--accent)]"
      >
        Marcar lida
      </Button>
    </form>
  );
}
