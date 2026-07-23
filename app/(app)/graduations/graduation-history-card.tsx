"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteGraduation,
  updateGraduation,
  type GraduationActionState,
} from "@/actions/graduations";
import { BeltPill } from "@/components/belts/belt-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BELT_OPTIONS } from "@/lib/validations/members";

export type GraduationHistoryItem = {
  id: string;
  member_id: string;
  member_name: string;
  belt: string;
  degree: number;
  graduated_at: string;
  notes: string | null;
  awarded_by_name: string | null;
  previous_belt: string | null;
  previous_degree: number | null;
};

const selectClassName =
  "flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50";

const initialState: GraduationActionState = null;

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function BeltTransition({
  previousBelt,
  previousDegree,
  belt,
  degree,
}: {
  previousBelt: string | null;
  previousDegree: number | null;
  belt: string;
  degree: number;
}) {
  const hasPrevious = Boolean(previousBelt) || previousDegree !== null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hasPrevious && previousBelt ? (
        <>
          <BeltPill
            belt={previousBelt}
            degree={previousDegree ?? 0}
            className="opacity-70"
          />
          <span className="text-xs text-[var(--grad-from-muted)]">→</span>
        </>
      ) : null}
      <BeltPill belt={belt} degree={degree} />
    </div>
  );
}

export function GraduationHistoryCard({
  graduation,
  canManage = false,
}: {
  graduation: GraduationHistoryItem;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");

  const [updateState, updateAction, updatePending] = useActionState(
    updateGraduation,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteGraduation,
    initialState,
  );

  useEffect(() => {
    if (!open) setMode("view");
  }, [open, graduation.id]);

  useEffect(() => {
    if (updateState?.error) toast.error(updateState.error);
    if (updateState?.success) {
      toast.success(updateState.success);
      setOpen(false);
      setMode("view");
      router.refresh();
    }
  }, [updateState, router]);

  useEffect(() => {
    if (deleteState?.error) toast.error(deleteState.error);
    if (deleteState?.success) {
      toast.success(deleteState.success);
      setOpen(false);
      setMode("view");
      router.refresh();
    }
  }, [deleteState, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-2xl border border-border bg-card p-4 text-left shadow-[var(--surface-shadow)] transition hover:bg-[var(--grad-card-hover)] active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <p className="truncate font-semibold text-foreground">
              {graduation.member_name}
            </p>
            <BeltTransition
              previousBelt={graduation.previous_belt}
              previousDegree={graduation.previous_degree}
              belt={graduation.belt}
              degree={graduation.degree}
            />
          </div>
          <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatDateShort(graduation.graduated_at)}
          </time>
        </div>

        {graduation.notes ? (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {graduation.notes}
          </p>
        ) : null}

        {graduation.awarded_by_name ? (
          <p className="mt-2 text-[10px] text-muted-foreground">
            Por {graduation.awarded_by_name}
          </p>
        ) : null}
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setMode("view");
        }}
      >
        <DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto bg-popover p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{graduation.member_name}</DialogTitle>
            <DialogDescription>
              {mode === "edit"
                ? "Corrija faixa, grau, data ou observações"
                : mode === "delete"
                  ? "Essa ação remove o registro do histórico"
                  : "Detalhes desta graduação no histórico"}
            </DialogDescription>
          </DialogHeader>

          {mode === "view" ? (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Progressão
                  </p>
                  <BeltTransition
                    previousBelt={graduation.previous_belt}
                    previousDegree={graduation.previous_degree}
                    belt={graduation.belt}
                    degree={graduation.degree}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 rounded-xl border border-border bg-card px-3 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Data
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {formatDate(graduation.graduated_at)}
                    </p>
                  </div>
                  <div className="space-y-1 rounded-xl border border-border bg-card px-3 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Concedida por
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {graduation.awarded_by_name ?? "—"}
                    </p>
                  </div>
                </div>

                {graduation.notes ? (
                  <div className="space-y-1 rounded-xl border border-border bg-card px-3 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Observações
                    </p>
                    <p className="text-sm leading-relaxed text-foreground">
                      {graduation.notes}
                    </p>
                  </div>
                ) : null}
              </div>

              {canManage ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={() => setMode("edit")}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-11"
                    onClick={() => setMode("delete")}
                  >
                    Apagar
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => setOpen(false)}
                >
                  Fechar
                </Button>
              )}
            </>
          ) : null}

          {mode === "edit" ? (
            <form action={updateAction} className="space-y-4">
              <input type="hidden" name="id" value={graduation.id} />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`belt-${graduation.id}`}>Faixa *</Label>
                  <select
                    id={`belt-${graduation.id}`}
                    name="belt"
                    required
                    defaultValue={graduation.belt}
                    className={selectClassName}
                  >
                    {BELT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`degree-${graduation.id}`}>Grau *</Label>
                  <Input
                    id={`degree-${graduation.id}`}
                    name="degree"
                    type="number"
                    min={0}
                    max={10}
                    required
                    defaultValue={graduation.degree}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`date-${graduation.id}`}>Data *</Label>
                <Input
                  id={`date-${graduation.id}`}
                  name="graduated_at"
                  type="date"
                  required
                  defaultValue={graduation.graduated_at}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`notes-${graduation.id}`}>Observações</Label>
                <textarea
                  id={`notes-${graduation.id}`}
                  name="notes"
                  rows={3}
                  defaultValue={graduation.notes ?? ""}
                  className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={updatePending}
                  onClick={() => setMode("view")}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="h-11"
                  disabled={updatePending}
                >
                  {updatePending ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            </form>
          ) : null}

          {mode === "delete" ? (
            <form action={deleteAction} className="space-y-4">
              <input type="hidden" name="id" value={graduation.id} />
              <p className="rounded-xl border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
                Apagar a graduação de{" "}
                <span className="font-medium text-foreground">
                  {graduation.member_name}
                </span>{" "}
                para{" "}
                <span className="font-medium text-foreground">
                  {graduation.belt}
                  {graduation.degree > 0 ? ` · ${graduation.degree}º` : ""}
                </span>
                ? A faixa atual do aluno será recalculada pelo histórico
                restante.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={deletePending}
                  onClick={() => setMode("view")}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  className="h-11"
                  disabled={deletePending}
                >
                  {deletePending ? "Apagando…" : "Confirmar"}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
