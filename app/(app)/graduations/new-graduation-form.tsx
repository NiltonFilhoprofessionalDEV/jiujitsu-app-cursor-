"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createGraduation,
  type GraduationActionState,
} from "@/actions/graduations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BeltPill } from "@/components/belts/belt-pill";
import { suggestNextGraduation } from "@/lib/graduations/suggest-next";
import { BELT_OPTIONS } from "@/lib/validations/members";

const selectClassName =
  "flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50";

const initialState: GraduationActionState = null;

export type GraduationMemberOption = {
  id: string;
  name: string;
  current_belt: string | null;
  current_degree: number;
};

export function NewGraduationForm({
  members,
  defaultMemberId,
  onSuccess,
}: {
  members: GraduationMemberOption[];
  defaultMemberId?: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createGraduation,
    initialState,
  );

  const initialMember =
    members.find((m) => m.id === defaultMemberId) ?? members[0] ?? null;

  const [memberId, setMemberId] = useState(initialMember?.id ?? "");

  const selected = useMemo(
    () => members.find((m) => m.id === memberId) ?? null,
    [members, memberId],
  );

  const suggested = useMemo(
    () =>
      suggestNextGraduation(
        selected?.current_belt,
        selected?.current_degree ?? 0,
      ),
    [selected],
  );

  const [belt, setBelt] = useState(suggested.belt);
  const [degree, setDegree] = useState(String(suggested.degree));

  useEffect(() => {
    const next = suggestNextGraduation(
      selected?.current_belt,
      selected?.current_degree ?? 0,
    );
    setBelt(next.belt);
    setDegree(String(next.degree));
  }, [selected?.id, selected?.current_belt, selected?.current_degree]);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      onSuccess?.();
    }
  }, [state, onSuccess]);

  if (members.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
        Nenhum membro ativo disponível para graduação.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="member_id">Aluno *</Label>
        <select
          id="member_id"
          name="member_id"
          required
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className={selectClassName}
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.current_belt
                ? ` · ${m.current_belt} (${m.current_degree})`
                : ""}
            </option>
          ))}
        </select>
      </div>

      {selected ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-[var(--grad-accent-wash)] px-3 py-2.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Atual
          </span>
          {selected.current_belt ? (
            <BeltPill
              belt={selected.current_belt}
              degree={selected.current_degree}
            />
          ) : (
            <span className="text-xs text-muted-foreground">Sem faixa</span>
          )}
          <span className="text-xs text-[var(--grad-from-muted)]">→</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Sugerido
          </span>
          <BeltPill belt={belt} degree={Number(degree) || 0} />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="belt">Faixa *</Label>
          <select
            id="belt"
            name="belt"
            required
            value={belt}
            onChange={(e) => setBelt(e.target.value)}
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
          <Label htmlFor="degree">Grau *</Label>
          <Input
            id="degree"
            name="degree"
            type="number"
            min={0}
            max={10}
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
            required
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="graduated_at">Data</Label>
        <Input
          id="graduated_at"
          name="graduated_at"
          type="date"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Input
          id="notes"
          name="notes"
          placeholder="Opcional"
          className="h-11"
        />
      </div>

      <Button
        type="submit"
        className="h-11 w-full bg-[var(--page-fab-bg)] text-[var(--page-fab-fg)]"
        disabled={pending}
      >
        {pending ? "Registrando…" : "Registrar graduação"}
      </Button>
    </form>
  );
}
