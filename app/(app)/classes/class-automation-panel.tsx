"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  saveClassAutomation,
  type AutoOpenInstructorOption,
  type ClassActionState,
  type ClassScheduleRow,
  type ScheduleDayOverrideRow,
} from "@/actions/classes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  findNextAutoOpen,
  formatAutoOpenPreview,
} from "@/lib/sessions/next-auto-open";
import { WEEKDAY_LABELS, formatTime, selectClassName } from "./labels";

const initialState: ClassActionState = null;

const OPEN_PRESETS = [
  { value: 15, label: "15 min antes" },
  { value: 30, label: "30 min antes" },
  { value: 45, label: "45 min antes" },
] as const;

const CLOSE_PRESETS = [
  { value: 0, label: "Na hora do fim" },
  { value: 15, label: "15 min depois" },
  { value: 30, label: "30 min depois" },
] as const;

function inferLead(schedules: ClassScheduleRow[]): number {
  const enabled = schedules.filter((s) => s.auto_open_enabled);
  if (enabled.length === 0) return 30;
  return enabled[0]?.auto_open_lead_minutes ?? 30;
}

function inferGrace(schedules: ClassScheduleRow[]): number {
  const enabled = schedules.filter((s) => s.auto_open_enabled);
  if (enabled.length === 0) return 15;
  return enabled[0]?.auto_close_grace_minutes ?? 15;
}

export function ClassAutomationPanel({
  classId,
  schedules,
  defaultInstructorId,
  instructors,
  canConfigure,
  timeZone,
  overrides,
}: {
  classId: string;
  schedules: ClassScheduleRow[];
  defaultInstructorId: string | null;
  instructors: AutoOpenInstructorOption[];
  canConfigure: boolean;
  timeZone: string;
  overrides: ScheduleDayOverrideRow[];
}) {
  const anyEnabled = schedules.some((s) => s.auto_open_enabled);
  const [enabled, setEnabled] = useState(anyEnabled);
  const [lead, setLead] = useState(inferLead(schedules));
  const [grace, setGrace] = useState(inferGrace(schedules));
  const [instructorId, setInstructorId] = useState(defaultInstructorId ?? "");

  const [state, formAction, pending] = useActionState(
    saveClassAutomation,
    initialState,
  );

  useEffect(() => {
    setEnabled(schedules.some((s) => s.auto_open_enabled));
    setLead(inferLead(schedules));
    setGrace(inferGrace(schedules));
  }, [schedules]);

  useEffect(() => {
    setInstructorId(defaultInstructorId ?? "");
  }, [defaultInstructorId]);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  const checklist = useMemo(() => {
    const hasSchedules = schedules.length > 0;
    const hasInstructor = Boolean(instructorId);
    return [
      {
        id: "schedules",
        ok: hasSchedules,
        label: hasSchedules
          ? `${schedules.length} horário${schedules.length === 1 ? "" : "s"} na grade`
          : "Cadastre a grade semanal",
      },
      {
        id: "instructor",
        ok: hasInstructor,
        label: hasInstructor
          ? "Professor responsável definido"
          : "Escolha o professor responsável",
      },
      {
        id: "auto",
        ok: enabled && hasSchedules && hasInstructor,
        label: enabled
          ? "Automação ligada"
          : "Ative a abertura automática",
      },
    ];
  }, [schedules, instructorId, enabled]);

  const readyCount = checklist.filter((c) => c.ok).length;
  const allReady = readyCount === checklist.length;

  const preview = useMemo(() => {
    if (!enabled) return null;
    return findNextAutoOpen({
      schedules,
      cancelledDays: overrides,
      timeZone,
    });
  }, [enabled, schedules, overrides, timeZone]);

  const instructorName =
    instructors.find((i) => i.id === instructorId)?.name ?? null;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl">
      <div>
        <h2 className="font-display text-lg tracking-[0.1em] text-foreground">
          Automação
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          A aula abre e fecha sozinha nos dias da grade — sem configurar horário
          por horário.
        </p>
      </div>

      <div
        className={
          allReady
            ? "rounded-xl border border-[var(--class-auto-ready-border)] bg-[var(--class-auto-ready)] px-3 py-2.5"
            : "rounded-xl border border-[var(--class-auto-warn-border)] bg-[var(--class-auto-warn)] px-3 py-2.5"
        }
      >
        <p className="text-xs font-medium text-foreground">
          {allReady
            ? "Pronto para abrir sozinho"
            : `Checklist · ${readyCount}/${checklist.length}`}
        </p>
        <ul className="mt-2 space-y-1">
          {checklist.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 text-[11px] text-muted-foreground"
            >
              <span
                className={
                  item.ok
                    ? "size-1.5 shrink-0 rounded-full bg-emerald-500"
                    : "size-1.5 shrink-0 rounded-full bg-muted-foreground/40"
                }
              />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {preview ? (
        <div className="rounded-xl border border-[var(--home-ops-live-border)] bg-[var(--home-ops-live)] px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Próxima abertura
          </p>
          <p className="mt-0.5 text-sm font-medium text-foreground">
            {formatAutoOpenPreview(preview, timeZone)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {WEEKDAY_LABELS[preview.weekday]} · treino{" "}
            {formatTime(preview.startTime)}
            {instructorName ? ` · ${instructorName}` : null}
          </p>
        </div>
      ) : enabled ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma abertura futura encontrada na grade (próximos 14 dias).
        </p>
      ) : null}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="class_id" value={classId} />
        <input
          type="hidden"
          name="auto_open_enabled"
          value={enabled ? "true" : "false"}
        />
        <input type="hidden" name="auto_open_lead_minutes" value={lead} />
        <input type="hidden" name="auto_close_grace_minutes" value={grace} />

        <div className="space-y-2">
          <Label htmlFor="default_instructor_id">Professor responsável</Label>
          <select
            id="default_instructor_id"
            name="default_instructor_id"
            value={instructorId}
            onChange={(e) => setInstructorId(e.target.value)}
            disabled={!canConfigure || pending}
            className={selectClassName}
          >
            <option value="">Selecione…</option>
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-3 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Abrir aula sozinha
            </p>
            <p className="text-[11px] text-muted-foreground">
              Vale para todos os horários desta turma
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={!canConfigure || pending}
            onClick={() => setEnabled((v) => !v)}
            className={
              enabled
                ? "relative h-7 w-12 shrink-0 rounded-full bg-[var(--action-red)] transition"
                : "relative h-7 w-12 shrink-0 rounded-full bg-muted transition"
            }
          >
            <span
              className={
                enabled
                  ? "absolute top-0.5 left-[1.55rem] size-6 rounded-full bg-white shadow transition"
                  : "absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition"
              }
            />
          </button>
        </label>

        {enabled ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Abrir com quanto de antecedência?</Label>
              <div className="grid grid-cols-3 gap-2">
                {OPEN_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    disabled={!canConfigure || pending}
                    onClick={() => setLead(preset.value)}
                    className={
                      lead === preset.value
                        ? "rounded-xl border border-[var(--class-sched-chip-active-border)] bg-[var(--class-sched-chip-active)] px-2 py-2.5 text-[11px] font-semibold text-foreground"
                        : "rounded-xl border border-border bg-[var(--class-sched-chip)] px-2 py-2.5 text-[11px] text-muted-foreground"
                    }
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fechar após o fim?</Label>
              <div className="grid grid-cols-3 gap-2">
                {CLOSE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    disabled={!canConfigure || pending}
                    onClick={() => setGrace(preset.value)}
                    className={
                      grace === preset.value
                        ? "rounded-xl border border-[var(--class-sched-chip-active-border)] bg-[var(--class-sched-chip-active)] px-2 py-2.5 text-[11px] font-semibold text-foreground"
                        : "rounded-xl border border-border bg-[var(--class-sched-chip)] px-2 py-2.5 text-[11px] text-muted-foreground"
                    }
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {canConfigure ? (
          <Button
            type="submit"
            disabled={pending}
            className="h-11 w-full bg-[var(--action-red)] text-white hover:bg-[var(--action-red)]/90"
          >
            {pending ? "Salvando…" : "Salvar automação"}
          </Button>
        ) : null}
      </form>
    </section>
  );
}
