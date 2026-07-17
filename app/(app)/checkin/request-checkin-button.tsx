"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  requestCheckin,
  type AttendanceActionState,
  type StudentCheckinStatus,
} from "@/actions/attendance";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initialState: AttendanceActionState = null;

const STATUS_UI: Record<
  StudentCheckinStatus,
  { label: string; className: string }
> = {
  available: {
    label: "Disponível",
    className: "bg-muted text-muted-foreground",
  },
  pending: {
    label: "Pendente",
    className: "bg-amber-500/15 text-amber-400",
  },
  approved: {
    label: "Aprovado",
    className: "bg-emerald-500/15 text-emerald-400",
  },
  rejected: {
    label: "Rejeitado",
    className: "bg-destructive/15 text-destructive",
  },
};

export function CheckinStatusBadge({
  status,
}: {
  status: StudentCheckinStatus;
}) {
  const ui = STATUS_UI[status];
  return (
    <span
      className={cn(
        "rounded-md px-2.5 py-1 text-xs font-medium",
        ui.className,
      )}
    >
      {ui.label}
    </span>
  );
}

export function RequestCheckinButton({
  sessionId,
  status,
}: {
  sessionId: string;
  status: StudentCheckinStatus;
}) {
  const [state, formAction, pending] = useActionState(
    requestCheckin,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  const effectiveStatus: StudentCheckinStatus =
    state?.success && (status === "available" || status === "rejected")
      ? "pending"
      : status;

  if (effectiveStatus === "pending") {
    return (
      <div className="space-y-2">
        <div className="flex h-12 w-full items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-base font-semibold text-amber-400">
          Aguardando aprovação
        </div>
        <p className="text-center text-sm text-muted-foreground">
          O professor vai confirmar sua presença.
        </p>
      </div>
    );
  }

  if (effectiveStatus === "approved") {
    return (
      <div className="flex h-12 w-full items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-base font-semibold text-emerald-400">
        Presença confirmada
      </div>
    );
  }

  const label =
    effectiveStatus === "rejected" ? "Tentar novamente" : "Registrar presença";

  return (
    <form action={formAction}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full bg-[var(--action-red)] text-base font-semibold text-primary-foreground hover:bg-[var(--action-red)]/90"
      >
        {pending ? "Enviando…" : label}
      </Button>
      {state?.error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
