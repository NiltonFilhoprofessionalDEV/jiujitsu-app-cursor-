"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  selectAcademyFromForm,
  type MyAcademy,
  type SelectAcademyState,
} from "@/actions/academies";
import { Button } from "@/components/ui/button";

const initialState: SelectAcademyState = null;

const roleLabels: Record<MyAcademy["role"], string> = {
  owner: "Proprietário",
  administrator: "Administrador",
  instructor: "Instrutor",
  assistant_instructor: "Instrutor auxiliar",
  student: "Aluno",
  guardian: "Responsável",
};

export function SelectAcademyList({ academies }: { academies: MyAcademy[] }) {
  const [state, formAction, pending] = useActionState(
    selectAcademyFromForm,
    initialState,
  );

  return (
    <div className="space-y-3">
      {state?.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      {academies.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">
            Nenhuma academia encontrada.
          </p>
          <Link
            href="/create-academy"
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Criar academia
          </Link>
        </div>
      ) : (
        academies.map((academy) => (
          <form
            key={academy.id}
            action={formAction}
            className="rounded-2xl border border-border bg-card p-4 shadow-xl backdrop-blur-xl"
          >
            <input type="hidden" name="academyId" value={academy.id} />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {academy.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[academy.city, academy.state].filter(Boolean).join(" · ") ||
                    "Sem localização"}
                  {" · "}
                  {roleLabels[academy.role]}
                </p>
              </div>
              <Button
                type="submit"
                disabled={pending}
                className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {pending ? "Entrando…" : "Entrar"}
              </Button>
            </div>
          </form>
        ))
      )}
    </div>
  );
}
