"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  manualAttendance,
  type AttendanceActionState,
  type ManualAttendanceOption,
  type SessionPresentRow,
} from "@/actions/attendance";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { selectClassName } from "@/app/(app)/classes/labels";

const initialState: AttendanceActionState = null;

export function SessionPresentList({
  present,
}: {
  present: SessionPresentRow[];
}) {
  if (present.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ninguém no tatame ainda.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {present.map((row) => (
        <li
          key={row.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-[var(--checkin-present-border)] bg-[var(--checkin-present-wash)] px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {row.student_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.student_belt ?? "Sem faixa"}
              {" · "}
              {row.attendance_type === "manual" ? "Manual" : "Check-in"}
            </p>
          </div>
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {new Date(row.checked_at).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ManualAttendanceForm({
  sessionId,
  options,
}: {
  sessionId: string;
  options: ManualAttendanceOption[];
}) {
  const [studentId, setStudentId] = useState(options[0]?.member_id ?? "");
  const [state, formAction, pending] = useActionState(
    manualAttendance,
    initialState,
  );

  const optionMap = useMemo(
    () => new Map(options.map((o) => [o.member_id, o])),
    [options],
  );

  useEffect(() => {
    if (!studentId && options[0]?.member_id) {
      setStudentId(options[0].member_id);
    }
  }, [options, studentId]);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todos os alunos da turma já estão presentes.
      </p>
    );
  }

  const selected = optionMap.get(studentId);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="space-y-2">
        <Label htmlFor="studentMemberId">Aluno da turma</Label>
        <select
          id="studentMemberId"
          name="studentMemberId"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          disabled={pending}
          className={selectClassName}
          required
        >
          {options.map((option) => (
            <option key={option.member_id} value={option.member_id}>
              {option.name}
              {option.belt ? ` · ${option.belt}` : ""}
            </option>
          ))}
        </select>
      </div>
      <Button
        type="submit"
        disabled={pending || !studentId}
        className="h-11 w-full bg-[var(--action-red)] text-primary-foreground hover:bg-[var(--action-red)]/90"
      >
        {pending
          ? "Registrando…"
          : selected
            ? `Marcar ${selected.name}`
            : "Marcar presença"}
      </Button>
    </form>
  );
}
