"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  approveCheckin,
  rejectCheckin,
  type AttendanceActionState,
  type PendingAttendanceRequest,
} from "@/actions/attendance";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const initialState: AttendanceActionState = null;

function PendingRow({
  request,
}: {
  request: PendingAttendanceRequest;
}) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveCheckin,
    initialState,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectCheckin,
    initialState,
  );

  useEffect(() => {
    if (approveState?.error) toast.error(approveState.error);
    if (approveState?.success) toast.success(approveState.success);
  }, [approveState]);

  useEffect(() => {
    if (rejectState?.error) toast.error(rejectState.error);
    if (rejectState?.success) toast.success(rejectState.success);
  }, [rejectState]);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {request.student_name}
        </p>
        <p className="text-xs text-muted-foreground">
          {request.student_belt ?? "Sem faixa"}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <form action={approveAction}>
          <input type="hidden" name="requestId" value={request.id} />
          <Button
            type="submit"
            size="sm"
            disabled={approvePending || rejectPending}
            className="bg-emerald-500 text-black hover:bg-emerald-400"
          >
            Aprovar
          </Button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="requestId" value={request.id} />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={approvePending || rejectPending}
            className="text-destructive hover:text-destructive"
          >
            Rejeitar
          </Button>
        </form>
      </div>
    </div>
  );
}

export function PendingRequestsList({
  sessionId,
  initialRequests,
}: {
  sessionId: string;
  initialRequests: PendingAttendanceRequest[];
}) {
  const [requests, setRequests] = useState(initialRequests);

  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`attendance-requests-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_requests",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          // Soft refresh: drop resolved rows client-side; full list via revalidate on actions
          setRequests((current) => current.filter((r) => r.status === "pending"));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum pedido de presença pendente.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((request) => (
        <PendingRow key={request.id} request={request} />
      ))}
    </div>
  );
}
