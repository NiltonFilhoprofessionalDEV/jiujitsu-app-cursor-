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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  findNextAutoOpen,
  formatAutoOpenPreview,
} from "@/lib/sessions/next-auto-open";
import { WEEKDAY_LABELS, formatTime, selectClassName } from "./labels";

const initialState: ClassActionState = null;

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

function parseMinutes(value: string, min: number, max: number, fallback: number) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
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
  const [lead, setLead] = useState(String(inferLead(schedules)));
  const [grace, setGrace] = useState(String(inferGrace(schedules)));
  const [instructorId, setInstructorId] = useState(defaultInstructorId ?? "");

  const leadMinutes = parseMinutes(lead, 5, 120, 30);
  const graceMinutes = parseMinutes(grace, 0, 60, 15);

  const [state, formAction, pending] = useActionState(
    saveClassAutomation,
    initialState,
  );

  useEffect(() => {
    setEnabled(schedules.some((s) => s.auto_open_enabled));
    setLead(String(inferLead(schedules)));
    setGrace(String(inferGrace(schedules)));
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
          Defina com quantos minutos de antecedência a aula abre e fecha sozinha
          — você fica livre de fazer isso na mão.
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
        <input type="hidden" name="auto_open_lead_minutes" value={leadMinutes} />
        <input
          type="hidden"
          name="auto_close_grace_minutes"
          value={graceMinutes}
        />

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
              Abrir e fechar sozinho
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="auto_open_lead_input">
                Abrir quantos minutos antes?
              </Label>
              <div className="relative">
                <Input
                  id="auto_open_lead_input"
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={120}
                  step={1}
                  required
                  value={lead}
                  onChange={(e) => setLead(e.target.value)}
                  onBlur={() => setLead(String(leadMinutes))}
                  disabled={!canConfigure || pending}
                  className="h-11 pr-16 tabular-nums"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                  min
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Ex.: 30 = abre meia hora antes do início (5–120)
              </p>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="auto_close_grace_input">
                Fechar quantos minutos depois do fim?
              </Label>
              <div className="relative">
                <Input
                  id="auto_close_grace_input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={60}
                  step={1}
                  required
                  value={grace}
                  onChange={(e) => setGrace(e.target.value)}
                  onBlur={() => setGrace(String(graceMinutes))}
                  disabled={!canConfigure || pending}
                  className="h-11 pr-16 tabular-nums"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                  min
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Ex.: 15 = fecha 15 min após o fim (0–60). 0 = na hora.
              </p>
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
