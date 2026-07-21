"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  setAcademySuspended,
  setMemberStatusAsPlatformAdmin,
  updatePlatformAcademy,
} from "@/actions/platform-admin-mutations";
import type {
  PlatformAcademyDetails,
  PlatformAdminActionState,
  PlatformMemberRow,
} from "@/lib/platform-admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAZIL_TIMEZONES } from "@/lib/sessions/auto-open";
import { selectClassName } from "@/app/(app)/classes/labels";

const roleLabels: Record<PlatformMemberRow["role"], string> = {
  owner: "Dono",
  administrator: "Administrador",
  instructor: "Instrutor",
  assistant_instructor: "Instrutor auxiliar",
  student: "Aluno",
  guardian: "Responsável",
};

const statusLabels: Record<PlatformMemberRow["status"], string> = {
  active: "Ativo",
  inactive: "Inativo",
  suspended: "Suspenso",
};

export function AcademyAdminForms({
  academy,
  members,
}: {
  academy: PlatformAcademyDetails;
  members: PlatformMemberRow[];
}) {
  const [editState, editAction, editPending] = useActionState(
    updatePlatformAcademy,
    null as PlatformAdminActionState,
  );
  const [suspendState, suspendAction, suspendPending] = useActionState(
    setAcademySuspended,
    null as PlatformAdminActionState,
  );
  const [memberState, memberAction, memberPending] = useActionState(
    setMemberStatusAsPlatformAdmin,
    null as PlatformAdminActionState,
  );

  useEffect(() => {
    if (editState?.success) toast.success(editState.success);
    if (editState?.error) toast.error(editState.error);
  }, [editState]);

  useEffect(() => {
    if (suspendState?.success) toast.success(suspendState.success);
    if (suspendState?.error) toast.error(suspendState.error);
  }, [suspendState]);

  useEffect(() => {
    if (memberState?.success) toast.success(memberState.success);
    if (memberState?.error) toast.error(memberState.error);
  }, [memberState]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-xl backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Status</h2>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              academy.isActive
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            {academy.isActive ? "Ativa" : "Suspensa"}
          </span>
        </div>

        {academy.isActive ? (
          <form action={suspendAction} className="space-y-3">
            <input type="hidden" name="academyId" value={academy.id} />
            <input type="hidden" name="suspend" value="true" />
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo da suspensão</Label>
              <Input
                id="reason"
                name="reason"
                required
                placeholder="Ex.: falta de pagamento"
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              variant="destructive"
              disabled={suspendPending}
              className="h-11 w-full"
            >
              {suspendPending ? "Suspendendo…" : "Suspender academia"}
            </Button>
          </form>
        ) : (
          <form action={suspendAction} className="space-y-3">
            <input type="hidden" name="academyId" value={academy.id} />
            <input type="hidden" name="suspend" value="false" />
            {academy.suspensionReason ? (
              <p className="text-sm text-destructive">
                Motivo atual: {academy.suspensionReason}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={suspendPending}
              className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {suspendPending ? "Reativando…" : "Reativar academia"}
            </Button>
          </form>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-xl backdrop-blur-xl">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Editar academia
        </h2>
        <form action={editAction} className="space-y-4">
          <input type="hidden" name="academyId" value={academy.id} />
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={academy.name}
              className="h-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={academy.phone ?? ""}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={academy.email ?? ""}
                className="h-11"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              name="instagram"
              defaultValue={academy.instagram ?? ""}
              className="h-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                name="city"
                defaultValue={academy.city ?? ""}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                name="state"
                defaultValue={academy.state ?? ""}
                className="h-11"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              name="address"
              defaultValue={academy.address ?? ""}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              name="description"
              defaultValue={academy.description ?? ""}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              name="timezone"
              defaultValue={academy.timezone}
              className={selectClassName}
            >
              {BRAZIL_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="submit"
            disabled={editPending}
            className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {editPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-xl backdrop-blur-xl">
        <h2 className="mb-1 text-base font-semibold text-foreground">
          Membros e papéis
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Visão de quem administra a academia. Você pode suspender um dono ou
          administrador individualmente.
        </p>
        <ul className="space-y-3">
          {members.map((member) => (
            <li
              key={member.id}
              className="rounded-xl border border-border bg-muted/20 p-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {member.name || "Sem nome"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email || "Sem e-mail"} · {roleLabels[member.role]} ·{" "}
                    {statusLabels[member.status]}
                  </p>
                </div>
                {(member.role === "owner" ||
                  member.role === "administrator") && (
                  <form action={memberAction} className="flex gap-2">
                    <input type="hidden" name="memberId" value={member.id} />
                    <input type="hidden" name="academyId" value={academy.id} />
                    {member.status === "active" ? (
                      <Button
                        type="submit"
                        name="status"
                        value="suspended"
                        variant="outline"
                        disabled={memberPending}
                        className="h-9"
                      >
                        Suspender
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        name="status"
                        value="active"
                        disabled={memberPending}
                        className="h-9"
                      >
                        Reativar
                      </Button>
                    )}
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
