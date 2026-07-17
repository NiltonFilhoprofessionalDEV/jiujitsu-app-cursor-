"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  addSchedulesBulk,
  copySchedulesFromClass,
  deleteSchedule,
  duplicateSchedule,
  type ClassActionState,
  type ClassScheduleRow,
} from "@/actions/classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  WEEKDAY_GRID,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
  formatTime,
  selectClassName,
} from "./labels";

const initialState: ClassActionState = null;

export type SiblingClassOption = {
  id: string;
  name: string;
  scheduleCount: number;
};

function WeekdayChips({
  selected,
  onToggle,
  occupied,
  disabled,
}: {
  selected: number[];
  onToggle: (day: number) => void;
  occupied?: Set<number>;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {WEEKDAY_GRID.map((day) => {
        const isOn = selected.includes(day);
        const hasSlot = occupied?.has(day);
        return (
          <button
            key={day}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(day)}
            className={
              isOn
                ? "relative flex h-11 flex-col items-center justify-center rounded-xl border border-[var(--class-sched-chip-active-border)] bg-[var(--class-sched-chip-active)] text-xs font-semibold text-foreground transition"
                : "relative flex h-11 flex-col items-center justify-center rounded-xl border border-border bg-[var(--class-sched-chip)] text-xs font-medium text-muted-foreground transition hover:text-foreground"
            }
            aria-pressed={isOn}
          >
            {WEEKDAY_SHORT[day]}
            {hasSlot ? (
              <span
                className="absolute bottom-1.5 size-1 rounded-full bg-[var(--class-sched-chip-dot)]"
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ScheduleRow({
  classId,
  schedule,
  canManage,
}: {
  classId: string;
  schedule: ClassScheduleRow;
  canManage: boolean;
}) {
  const [dupDays, setDupDays] = useState<number[]>([]);
  const [showDup, setShowDup] = useState(false);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteSchedule,
    initialState,
  );
  const [dupState, dupAction, dupPending] = useActionState(
    duplicateSchedule,
    initialState,
  );

  useEffect(() => {
    if (deleteState?.error) toast.error(deleteState.error);
    if (deleteState?.success) toast.success(deleteState.success);
  }, [deleteState]);

  useEffect(() => {
    if (dupState?.error) toast.error(dupState.error);
    if (dupState?.success) {
      toast.success(dupState.success);
      setShowDup(false);
      setDupDays([]);
    }
  }, [dupState]);

  return (
    <li className="rounded-xl border border-border bg-background/40 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">
            {WEEKDAY_LABELS[schedule.weekday]}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatTime(schedule.start_time)} – {formatTime(schedule.end_time)}
          </p>
        </div>
        {canManage ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setShowDup((v) => !v)}
            >
              Duplicar
            </Button>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={schedule.id} />
              <input type="hidden" name="class_id" value={classId} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                disabled={deletePending}
                className="h-8 px-2 text-xs text-destructive hover:text-destructive"
              >
                Remover
              </Button>
            </form>
          </div>
        ) : null}
      </div>

      {showDup && canManage ? (
        <form action={dupAction} className="mt-3 space-y-2 border-t border-border pt-3">
          <input type="hidden" name="id" value={schedule.id} />
          <input type="hidden" name="class_id" value={classId} />
          {dupDays.map((day) => (
            <input key={day} type="hidden" name="weekdays" value={day} />
          ))}
          <p className="text-[11px] text-muted-foreground">
            Copiar este horário para outros dias
          </p>
          <WeekdayChips
            selected={dupDays}
            onToggle={(day) => {
              if (day === schedule.weekday) return;
              setDupDays((prev) =>
                prev.includes(day)
                  ? prev.filter((d) => d !== day)
                  : [...prev, day].sort((a, b) => a - b),
              );
            }}
            disabled={dupPending}
          />
          <Button
            type="submit"
            size="sm"
            disabled={dupPending || dupDays.length === 0}
            className="h-9 w-full"
          >
            {dupPending ? "Duplicando…" : "Duplicar horário"}
          </Button>
        </form>
      ) : null}
    </li>
  );
}

export function ClassScheduleBoard({
  classId,
  schedules,
  canManage,
  siblingClasses,
}: {
  classId: string;
  schedules: ClassScheduleRow[];
  canManage: boolean;
  siblingClasses: SiblingClassOption[];
}) {
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]);
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("20:30");
  const [showCopy, setShowCopy] = useState(false);

  const [addState, addAction, addPending] = useActionState(
    addSchedulesBulk,
    initialState,
  );
  const [copyState, copyAction, copyPending] = useActionState(
    copySchedulesFromClass,
    initialState,
  );

  useEffect(() => {
    if (addState?.error) toast.error(addState.error);
    if (addState?.success) {
      toast.success(addState.success);
      setSelectedDays([]);
    }
  }, [addState]);

  useEffect(() => {
    if (copyState?.error) toast.error(copyState.error);
    if (copyState?.success) {
      toast.success(copyState.success);
      setShowCopy(false);
    }
  }, [copyState]);

  const occupiedDays = useMemo(
    () => new Set(schedules.map((s) => s.weekday)),
    [schedules],
  );

  const byWeekday = useMemo(() => {
    const map = new Map<number, ClassScheduleRow[]>();
    for (const day of WEEKDAY_GRID) map.set(day, []);
    for (const schedule of schedules) {
      const list = map.get(schedule.weekday) ?? [];
      list.push(schedule);
      map.set(schedule.weekday, list);
    }
    return WEEKDAY_GRID.flatMap((day) => map.get(day) ?? []);
  }, [schedules]);

  const copySources = siblingClasses.filter(
    (c) => c.id !== classId && c.scheduleCount > 0,
  );

  return (
    <div className="space-y-4">
      {canManage ? (
        <form action={addAction} className="space-y-3">
          <input type="hidden" name="class_id" value={classId} />
          {selectedDays.map((day) => (
            <input key={day} type="hidden" name="weekdays" value={day} />
          ))}

          <div className="space-y-2">
            <Label>Dias da semana</Label>
            <WeekdayChips
              selected={selectedDays}
              occupied={occupiedDays}
              onToggle={(day) =>
                setSelectedDays((prev) =>
                  prev.includes(day)
                    ? prev.filter((d) => d !== day)
                    : [...prev, day].sort((a, b) => a - b),
                )
              }
              disabled={addPending}
            />
            <p className="text-[11px] text-muted-foreground">
              Toque nos dias · o ponto indica dia que já tem horário
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="start_time">Início</Label>
              <Input
                id="start_time"
                name="start_time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={addPending}
                className="h-11 w-full min-w-0 max-w-full"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="end_time">Fim</Label>
              <Input
                id="end_time"
                name="end_time"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={addPending}
                className="h-11 w-full min-w-0 max-w-full"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={addPending || selectedDays.length === 0}
            className="h-11 w-full bg-[var(--action-red)] text-white hover:bg-[var(--action-red)]/90"
          >
            {addPending
              ? "Adicionando…"
              : selectedDays.length <= 1
                ? "Adicionar horário"
                : `Adicionar em ${selectedDays.length} dias`}
          </Button>
        </form>
      ) : null}

      {canManage && copySources.length > 0 ? (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full border-border"
            onClick={() => setShowCopy((v) => !v)}
          >
            {showCopy ? "Fechar cópia" : "Copiar grade de outra turma"}
          </Button>
          {showCopy ? (
            <form
              action={copyAction}
              className="space-y-3 rounded-xl border border-border bg-background/40 p-3"
            >
              <input type="hidden" name="class_id" value={classId} />
              <div className="space-y-2">
                <Label htmlFor="source_class_id">Turma de origem</Label>
                <select
                  id="source_class_id"
                  name="source_class_id"
                  required
                  disabled={copyPending}
                  className={selectClassName}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {copySources.map((klass) => (
                    <option key={klass.id} value={klass.id}>
                      {klass.name} ({klass.scheduleCount})
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  name="replace_existing"
                  value="true"
                  className="size-4 rounded border-border"
                />
                Substituir horários atuais desta turma
              </label>
              <Button
                type="submit"
                disabled={copyPending}
                variant="outline"
                className="h-10 w-full"
              >
                {copyPending ? "Copiando…" : "Copiar grade"}
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {byWeekday.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          Nenhum horário ainda. Monte a grade semanal acima.
        </p>
      ) : (
        <ul className="space-y-2">
          {byWeekday.map((schedule) => (
            <ScheduleRow
              key={schedule.id}
              classId={classId}
              schedule={schedule}
              canManage={canManage}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
