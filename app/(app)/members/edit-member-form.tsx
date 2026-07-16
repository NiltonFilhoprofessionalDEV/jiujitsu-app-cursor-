"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  updateMember,
  type AcademyMemberRow,
  type MemberActionState,
} from "@/actions/members";
import type { MemberRole } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BELT_OPTIONS,
  ROLE_LABELS,
  STATUS_OPTIONS,
  selectClassName,
} from "./labels";

const initialState: MemberActionState = null;

export function EditMemberForm({
  member,
  assignableRoles,
  canEdit,
}: {
  member: AcademyMemberRow;
  assignableRoles: MemberRole[];
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateMember,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  const roleOptions = Array.from(
    new Set([member.role, ...assignableRoles]),
  ) as MemberRole[];

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={member.id} />

      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
        <p className="font-semibold text-foreground">{member.profile.name}</p>
        <p className="text-xs text-muted-foreground">{member.profile.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="role">Papel</Label>
          <select
            id="role"
            name="role"
            defaultValue={member.role}
            disabled={!canEdit}
            className={selectClassName}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={member.status}
            disabled={!canEdit}
            className={selectClassName}
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="current_belt">Faixa</Label>
          <select
            id="current_belt"
            name="current_belt"
            defaultValue={member.current_belt ?? ""}
            disabled={!canEdit}
            className={selectClassName}
          >
            <option value="">Sem faixa</option>
            {BELT_OPTIONS.map((belt) => (
              <option key={belt} value={belt}>
                {belt}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="current_degree">Grau</Label>
          <Input
            id="current_degree"
            name="current_degree"
            type="number"
            min={0}
            max={10}
            defaultValue={member.current_degree}
            disabled={!canEdit}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergency_contact_name">Contato de emergência</Label>
        <Input
          id="emergency_contact_name"
          name="emergency_contact_name"
          defaultValue={member.emergency_contact_name ?? ""}
          disabled={!canEdit}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergency_contact_phone">Telefone de emergência</Label>
        <Input
          id="emergency_contact_phone"
          name="emergency_contact_phone"
          type="tel"
          defaultValue={member.emergency_contact_phone ?? ""}
          disabled={!canEdit}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="medical_notes">Observações médicas</Label>
        <textarea
          id="medical_notes"
          name="medical_notes"
          rows={3}
          defaultValue={member.medical_notes ?? ""}
          disabled={!canEdit}
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
        />
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      {canEdit ? (
        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          Você pode visualizar, mas não editar membros.
        </p>
      )}
    </form>
  );
}
