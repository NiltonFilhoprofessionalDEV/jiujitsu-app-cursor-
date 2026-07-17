"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
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
  onResolved,
}: {
  request: PendingAttendanceRequest;
  onResolved: (id: string) => void;
}) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveCheckin,
    initialState,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectCheckin,
    initialState,
  );
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (approveState?.error) toast.error(approveState.error);
    if (approveState?.success && !resolvedRef.current) {
      resolvedRef.current = true;
      toast.success(approveState.success);
      onResolved(request.id);
    }
  }, [approveState, onResolved, request.id]);

  useEffect(() => {
    if (rejectState?.error) toast.error(rejectState.error);
    if (rejectState?.success && !resolvedRef.current) {
      resolvedRef.current = true;
      toast.success(rejectState.success);
      onResolved(request.id);
    }
  }, [rejectState, onResolved, request.id]);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-3">
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
            className="bg-emerald-500 text-primary-foreground hover:bg-emerald-400"
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

  const onResolved = useCallback((id: string) => {
    setRequests((current) => current.filter((row) => row.id !== id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;
    let supabase: ReturnType<typeof createClient> | null = null;

    try {
      supabase = createClient();
      channel = supabase
        .channel(`attendance-requests-${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "attendance_requests",
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            if (cancelled) return;
            const row = payload.new as {
              id?: string;
              session_id?: string;
              student_id?: string;
              requested_at?: string;
              status?: string;
            };
            if (!row?.id || row.status !== "pending") return;
            setRequests((current) => {
              if (current.some((r) => r.id === row.id)) return current;
              return [
                ...current,
                {
                  id: row.id!,
                  session_id: row.session_id ?? sessionId,
                  student_id: row.student_id ?? "",
                  requested_at: row.requested_at ?? new Date().toISOString(),
                  status: "pending",
                  student_name: "Novo pedido",
                  student_belt: null,
                },
              ];
            });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "attendance_requests",
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            if (cancelled) return;
            const row = payload.new as { id?: string; status?: string };
            if (!row?.id) return;
            if (row.status && row.status !== "pending") {
              setRequests((current) =>
                current.filter((r) => r.id !== row.id),
              );
            }
          },
        )
        .subscribe();
    } catch {
      // Realtime opcional
    }

    return () => {
      cancelled = true;
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
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
        <PendingRow
          key={request.id}
          request={request}
          onResolved={onResolved}
        />
      ))}
    </div>
  );
}
