"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  addSchedule,
  deleteSchedule,
  type ClassActionState,
  type ClassScheduleRow,
} from "@/actions/classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  WEEKDAY_LABELS,
  WEEKDAY_OPTIONS,
  formatTime,
  selectClassName,
} from "./labels";

const initialState: ClassActionState = null;

export function ClassSchedulesManager({
  classId,
  schedules,
  canManage,
}: {
  classId: string;
  schedules: ClassScheduleRow[];
  canManage: boolean;
}) {
  const [addState, addAction, addPending] = useActionState(
    addSchedule,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteSchedule,
    initialState,
  );

  useEffect(() => {
    if (addState?.error) toast.error(addState.error);
    if (addState?.success) toast.success(addState.success);
  }, [addState]);

  useEffect(() => {
    if (deleteState?.error) toast.error(deleteState.error);
    if (deleteState?.success) toast.success(deleteState.success);
  }, [deleteState]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum horário semanal cadastrado.
          </p>
        ) : (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {WEEKDAY_LABELS[schedule.weekday] ?? schedule.weekday}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(schedule.start_time)} –{" "}
                  {formatTime(schedule.end_time)}
                </p>
              </div>
              {canManage ? (
                <form action={deleteAction}>
                  <input type="hidden" name="id" value={schedule.id} />
                  <input type="hidden" name="class_id" value={classId} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    disabled={deletePending}
                    className="text-destructive hover:text-destructive"
                  >
                    Remover
                  </Button>
                </form>
              ) : null}
            </div>
          ))
        )}
      </div>

      {canManage ? (
        <form
          action={addAction}
          className="space-y-3 rounded-xl border border-border bg-card p-3"
        >
          <p className="text-sm font-medium text-foreground">Novo horário</p>
          <input type="hidden" name="class_id" value={classId} />
          <div className="space-y-2">
            <Label htmlFor="weekday">Dia</Label>
            <select
              id="weekday"
              name="weekday"
              defaultValue={1}
              className={selectClassName}
              required
            >
              {WEEKDAY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_time">Início</Label>
              <Input
                id="start_time"
                name="start_time"
                type="time"
                required
                defaultValue="19:00"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Fim</Label>
              <Input
                id="end_time"
                name="end_time"
                type="time"
                required
                defaultValue="20:00"
                className="h-11"
              />
            </div>
          </div>
          {addState?.error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {addState.error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={addPending}
            className="h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {addPending ? "Salvando…" : "Adicionar horário"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
