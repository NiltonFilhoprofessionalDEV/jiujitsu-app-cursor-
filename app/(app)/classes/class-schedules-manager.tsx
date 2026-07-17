"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  addSchedule,
  deleteSchedule,
  updateScheduleAutoOpen,
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

const DEFAULT_LEAD_MINUTES = 30;
const DEFAULT_GRACE_MINUTES = 15;

function ScheduleAutoOpenRow({
  classId,
  schedule,
  canConfigure,
  hasInstructor,
}: {
  classId: string;
  schedule: ClassScheduleRow;
  canConfigure: boolean;
  hasInstructor: boolean;
}) {
  const [enabled, setEnabled] = useState(schedule.auto_open_enabled);
  const [leadMinutes, setLeadMinutes] = useState(
    schedule.auto_open_enabled
      ? schedule.auto_open_lead_minutes
      : DEFAULT_LEAD_MINUTES,
  );
  const [graceMinutes, setGraceMinutes] = useState(
    schedule.auto_open_enabled
      ? schedule.auto_close_grace_minutes
      : DEFAULT_GRACE_MINUTES,
  );
  const [saved, setSaved] = useState({
    enabled: schedule.auto_open_enabled,
    lead: schedule.auto_open_enabled
      ? schedule.auto_open_lead_minutes
      : DEFAULT_LEAD_MINUTES,
    grace: schedule.auto_open_enabled
      ? schedule.auto_close_grace_minutes
      : DEFAULT_GRACE_MINUTES,
  });
  const [state, formAction, pending] = useActionState(
    updateScheduleAutoOpen,
    initialState,
  );

  useEffect(() => {
    const nextEnabled = schedule.auto_open_enabled;
    const nextLead = nextEnabled
      ? schedule.auto_open_lead_minutes
      : DEFAULT_LEAD_MINUTES;
    const nextGrace = nextEnabled
      ? schedule.auto_close_grace_minutes
      : DEFAULT_GRACE_MINUTES;
    setEnabled(nextEnabled);
    setLeadMinutes(nextLead);
    setGraceMinutes(nextGrace);
    setSaved({
      enabled: nextEnabled,
      lead: nextLead,
      grace: nextGrace,
    });
  }, [
    schedule.auto_open_enabled,
    schedule.auto_open_lead_minutes,
    schedule.auto_close_grace_minutes,
  ]);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      setSaved({
        enabled,
        lead: Number(leadMinutes),
        grace: Number(graceMinutes),
      });
    }
    // Só reage ao resultado da action; valores locais no momento do sucesso.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [state]);

  function handleToggle() {
    setEnabled((current) => {
      const next = !current;
      if (!next) {
        setLeadMinutes(DEFAULT_LEAD_MINUTES);
        setGraceMinutes(DEFAULT_GRACE_MINUTES);
      } else if (!saved.enabled) {
        setLeadMinutes(DEFAULT_LEAD_MINUTES);
        setGraceMinutes(DEFAULT_GRACE_MINUTES);
      } else {
        setLeadMinutes(saved.lead);
        setGraceMinutes(saved.grace);
      }
      return next;
    });
  }

  const blocked = !hasInstructor;
  const isInEffect = saved.enabled;

  const isDirty = useMemo(() => {
    return (
      enabled !== saved.enabled ||
      Number(leadMinutes) !== saved.lead ||
      Number(graceMinutes) !== saved.grace
    );
  }, [enabled, leadMinutes, graceMinutes, saved]);

  const saveDisabled = pending || !isDirty || (enabled && blocked);

  return (
    <div
      className={`space-y-3 rounded-xl border px-3 py-3 ${
        isInEffect
          ? "border-[var(--action-red)]/40 bg-[var(--action-red)]/5"
          : "border-border bg-background/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {WEEKDAY_LABELS[schedule.weekday] ?? schedule.weekday}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatTime(schedule.start_time)} – {formatTime(schedule.end_time)}
          </p>
        </div>
        {isInEffect ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--action-red)]/30 bg-[var(--action-red)]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--action-red)]">
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--action-red)]"
              aria-hidden
            />
            Em vigor
          </span>
        ) : null}
      </div>

      {isInEffect ? (
        <p className="rounded-lg border border-[var(--action-red)]/20 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
          Abertura automática ativa: abre{" "}
          <span className="font-medium text-foreground">{saved.lead} min</span>{" "}
          antes e fecha{" "}
          <span className="font-medium text-foreground">{saved.grace} min</span>{" "}
          depois do fim.
        </p>
      ) : null}

      {canConfigure ? (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={schedule.id} />
          <input type="hidden" name="class_id" value={classId} />
          <input
            type="hidden"
            name="auto_open_enabled"
            value={enabled ? "true" : "false"}
          />

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Abrir automaticamente
              </p>
              {blocked ? (
                <p className="text-[11px] text-muted-foreground">
                  Escolha o professor da abertura automática
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {isInEffect && !isDirty
                    ? "Em vigor neste horário"
                    : enabled
                      ? "Salve para colocar em vigor"
                      : isInEffect
                        ? "Salve para desativar e voltar ao padrão"
                        : "Desativada · padrão 30 min / 15 min"}
                </p>
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={blocked || pending}
              onClick={handleToggle}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
                enabled ? "bg-[var(--action-red)]" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`lead-${schedule.id}`}>Abrir (min antes)</Label>
              <Input
                id={`lead-${schedule.id}`}
                name="auto_open_lead_minutes"
                type="number"
                min={5}
                max={120}
                value={leadMinutes}
                onChange={(event) =>
                  setLeadMinutes(Number(event.target.value))
                }
                disabled={!enabled || pending}
                className="h-10"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`grace-${schedule.id}`}>Fechar (min após)</Label>
              <Input
                id={`grace-${schedule.id}`}
                name="auto_close_grace_minutes"
                type="number"
                min={0}
                max={60}
                value={graceMinutes}
                onChange={(event) =>
                  setGraceMinutes(Number(event.target.value))
                }
                disabled={!enabled || pending}
                className="h-10"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={saveDisabled}
            variant="outline"
            className="h-9 w-full border-border"
          >
            {pending
              ? "Salvando…"
              : isInEffect && !isDirty
                ? "Já salvo · em vigor"
                : "Salvar horário"}
          </Button>
        </form>
      ) : schedule.auto_open_enabled ? (
        <p className="text-xs text-[var(--action-red)]">
          Auto · {schedule.auto_open_lead_minutes} min antes · fecha +
          {schedule.auto_close_grace_minutes} min
        </p>
      ) : null}
    </div>
  );
}

export function ClassSchedulesManager({
  classId,
  schedules,
  canManage,
  canConfigureAuto,
  hasDefaultInstructor,
}: {
  classId: string;
  schedules: ClassScheduleRow[];
  canManage: boolean;
  canConfigureAuto: boolean;
  hasDefaultInstructor: boolean;
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
            <div key={schedule.id} className="space-y-2">
              <ScheduleAutoOpenRow
                classId={classId}
                schedule={schedule}
                canConfigure={canConfigureAuto}
                hasInstructor={hasDefaultInstructor}
              />
              {canManage ? (
                <form action={deleteAction} className="flex justify-end">
                  <input type="hidden" name="id" value={schedule.id} />
                  <input type="hidden" name="class_id" value={classId} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    disabled={deletePending}
                    className="text-destructive hover:text-destructive"
                  >
                    Remover horário
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
