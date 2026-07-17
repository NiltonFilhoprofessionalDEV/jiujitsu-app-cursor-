"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import {
  deleteClass,
  type ClassActionState,
  type ClassRow,
} from "@/actions/classes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  findNextTraining,
  formatNextTrainingLabel,
} from "@/lib/classes/next-training";
import { swrKeys } from "@/lib/swr/keys";
import { WEEKDAY_LABELS, formatTime } from "@/app/(app)/classes/labels";

const initialState: ClassActionState = null;

function ClassSchedules({
  klass,
  isStudent,
  timeZone,
  openSessionId,
}: {
  klass: ClassRow;
  isStudent: boolean;
  timeZone: string;
  openSessionId: string | null;
}) {
  const now = new Date();
  const schedules = klass.schedules ?? [];
  const next = isStudent
    ? findNextTraining(schedules, now, timeZone)
    : null;
  const isOpen = Boolean(openSessionId);

  return (
    <>
      {isStudent ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {next ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Próximo treino
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatNextTrainingLabel(next)}
              </span>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Status
            </span>
            {isOpen ? (
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                Check-in aberto
              </span>
            ) : (
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Aula fechada
              </span>
            )}
          </div>

          {isOpen ? (
            <Link
              href="/checkin"
              className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Ir para check-in
            </Link>
          ) : null}
        </div>
      ) : null}

      {schedules.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
          {isStudent ? (
            <li className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Grade semanal
            </li>
          ) : null}
          {schedules.map((schedule) => {
            const highlight =
              Boolean(next) && next!.scheduleId === schedule.id;
            return (
              <li
                key={schedule.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span
                  className={
                    isStudent && highlight
                      ? "font-semibold text-foreground"
                      : "font-medium text-foreground"
                  }
                >
                  {WEEKDAY_LABELS[schedule.weekday]}
                  {isStudent &&
                  next?.isOngoing &&
                  next.scheduleId === schedule.id
                    ? " · agora"
                    : null}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatTime(schedule.start_time)}–
                  {formatTime(schedule.end_time)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Sem horários cadastrados ainda
        </p>
      )}
    </>
  );
}

export function ClassListCard({
  klass,
  canManage,
  isStudent,
  timeZone,
  openSessionId,
}: {
  klass: ClassRow;
  canManage: boolean;
  isStudent: boolean;
  timeZone: string;
  openSessionId: string | null;
}) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteClass,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      setConfirmOpen(false);
      setMenuOpen(false);
      void mutate(swrKeys.classesBoard);
      router.refresh();
    }
  }, [state, router, mutate]);

  if (isStudent) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl">
        <p className="truncate font-semibold text-foreground">{klass.name}</p>
        <ClassSchedules
          klass={klass}
          isStudent
          timeZone={timeZone}
          openSessionId={openSessionId}
        />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl transition hover:bg-muted/40">
        <div className="flex items-start gap-2">
          <Link
            href={`/classes/${klass.id}`}
            className="min-w-0 flex-1 transition active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {klass.name}
                </p>
                {klass.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {klass.description}
                  </p>
                ) : null}
              </div>
              <span
                className={
                  klass.is_active
                    ? "shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
                    : "shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                }
              >
                {klass.is_active ? "Ativa" : "Inativa"}
              </span>
            </div>

            <ClassSchedules
              klass={klass}
              isStudent={false}
              timeZone={timeZone}
              openSessionId={openSessionId}
            />
          </Link>

          {canManage ? (
            <button
              type="button"
              aria-label={`Mais ações de ${klass.name}`}
              onClick={() => setMenuOpen(true)}
              className="-mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
            >
              <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
      </div>

      {canManage ? (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            side="bottom"
            className="mx-auto max-w-lg gap-0 rounded-t-2xl border-border bg-popover pb-[max(1rem,env(safe-area-inset-bottom))]"
            showCloseButton
          >
            <SheetHeader className="border-b border-border px-4 pb-3 pt-4">
              <SheetTitle>{klass.name}</SheetTitle>
              <SheetDescription>Gerenciar turma</SheetDescription>
            </SheetHeader>
            <div className="space-y-1 px-2 py-3">
              <Link
                href={`/classes/${klass.id}/edit`}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
                onClick={() => setMenuOpen(false)}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-destructive transition hover:bg-destructive/10"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="gap-5 bg-popover p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir turma?</DialogTitle>
            <DialogDescription>
              Remover <strong>{klass.name}</strong>? Se houver aulas ou
              histórico, a turma será só inativada para preservar os registros.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="grid grid-cols-2 gap-2">
            <input type="hidden" name="id" value={klass.id} />
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="h-11"
              disabled={pending}
            >
              {pending ? "Excluindo…" : "Excluir"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
