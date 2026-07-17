"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  deleteScheduleDayOverride,
  upsertScheduleDayOverride,
  type AutoOpenInstructorOption,
  type ClassActionState,
  type ClassScheduleRow,
  type ScheduleDayOverrideRow,
} from "@/actions/classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  WEEKDAY_LABELS,
  formatTime,
  selectClassName,
} from "./labels";

const initialState: ClassActionState = null;

function formatDatePt(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(y, m - 1, d, 12));
}

export function ClassDayOverrides({
  classId,
  schedules,
  overrides,
  instructors,
  canConfigure,
}: {
  classId: string;
  schedules: ClassScheduleRow[];
  overrides: ScheduleDayOverrideRow[];
  instructors: AutoOpenInstructorOption[];
  canConfigure: boolean;
}) {
  const [mode, setMode] = useState<"cancel" | "substitute">("cancel");
  const [scheduleId, setScheduleId] = useState(schedules[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [substituteId, setSubstituteId] = useState("");
  const [note, setNote] = useState("");

  const [saveState, saveAction, savePending] = useActionState(
    upsertScheduleDayOverride,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteScheduleDayOverride,
    initialState,
  );

  useEffect(() => {
    if (!scheduleId && schedules[0]?.id) {
      setScheduleId(schedules[0].id);
    }
  }, [schedules, scheduleId]);

  useEffect(() => {
    if (saveState?.error) toast.error(saveState.error);
    if (saveState?.success) {
      toast.success(saveState.success);
      setNote("");
    }
  }, [saveState]);

  useEffect(() => {
    if (deleteState?.error) toast.error(deleteState.error);
    if (deleteState?.success) toast.success(deleteState.success);
  }, [deleteState]);

  const scheduleMap = useMemo(() => {
    const map = new Map(schedules.map((s) => [s.id, s]));
    return map;
  }, [schedules]);

  const instructorMap = useMemo(() => {
    const map = new Map(instructors.map((i) => [i.id, i.name]));
    return map;
  }, [instructors]);

  if (!canConfigure || schedules.length === 0) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl">
      <div>
        <h2 className="font-display text-lg tracking-[0.1em] text-foreground">
          Exceções do dia
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Cancele um treino ou troque o professor sem apagar a grade semanal.
        </p>
      </div>

      <form action={saveAction} className="space-y-3">
        <input type="hidden" name="class_id" value={classId} />
        <input type="hidden" name="mode" value={mode} />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("cancel")}
            className={
              mode === "cancel"
                ? "rounded-xl border border-[var(--class-sched-chip-active-border)] bg-[var(--class-sched-chip-active)] px-3 py-2.5 text-xs font-semibold"
                : "rounded-xl border border-border bg-[var(--class-sched-chip)] px-3 py-2.5 text-xs text-muted-foreground"
            }
          >
            Cancelar dia
          </button>
          <button
            type="button"
            onClick={() => setMode("substitute")}
            className={
              mode === "substitute"
                ? "rounded-xl border border-[var(--class-sched-chip-active-border)] bg-[var(--class-sched-chip-active)] px-3 py-2.5 text-xs font-semibold"
                : "rounded-xl border border-border bg-[var(--class-sched-chip)] px-3 py-2.5 text-xs text-muted-foreground"
            }
          >
            Substituir professor
          </button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule_id">Horário</Label>
          <select
            id="schedule_id"
            name="schedule_id"
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            disabled={savePending}
            className={selectClassName}
            required
          >
            {schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {WEEKDAY_LABELS[schedule.weekday]} ·{" "}
                {formatTime(schedule.start_time)}–
                {formatTime(schedule.end_time)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="override_date">Data</Label>
          <Input
            id="override_date"
            name="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={savePending}
            className="h-11"
          />
        </div>

        {mode === "substitute" ? (
          <div className="space-y-2">
            <Label htmlFor="substitute_instructor_id">Substituto</Label>
            <select
              id="substitute_instructor_id"
              name="substitute_instructor_id"
              value={substituteId}
              onChange={(e) => setSubstituteId(e.target.value)}
              disabled={savePending}
              className={selectClassName}
              required
            >
              <option value="">Selecione…</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="override_note">Motivo (opcional)</Label>
          <Input
            id="override_note"
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Feriado, viagem…"
            disabled={savePending}
            className="h-11"
          />
        </div>

        <Button
          type="submit"
          disabled={savePending}
          variant="outline"
          className="h-10 w-full border-border"
        >
          {savePending
            ? "Salvando…"
            : mode === "cancel"
              ? "Cancelar este dia"
              : "Salvar substituição"}
        </Button>
      </form>

      {overrides.length > 0 ? (
        <ul className="space-y-2 border-t border-border pt-3">
          {overrides.map((row) => {
            const schedule = scheduleMap.get(row.schedule_id);
            return (
              <li
                key={row.id}
                className={
                  row.cancelled
                    ? "flex items-start justify-between gap-2 rounded-xl border border-border bg-[var(--class-override-cancel)] px-3 py-2.5"
                    : "flex items-start justify-between gap-2 rounded-xl border border-border bg-background/40 px-3 py-2.5"
                }
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {formatDatePt(row.date)}
                    {schedule
                      ? ` · ${formatTime(schedule.start_time)}`
                      : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.cancelled
                      ? "Treino cancelado"
                      : `Substituto: ${instructorMap.get(row.substitute_instructor_id ?? "") ?? "—"}`}
                    {row.note ? ` · ${row.note}` : null}
                  </p>
                </div>
                <form action={deleteAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="class_id" value={classId} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    disabled={deletePending}
                    className="h-8 shrink-0 px-2 text-xs"
                  >
                    Desfazer
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
