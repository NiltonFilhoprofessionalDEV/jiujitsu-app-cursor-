"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addClassMember,
  removeClassMember,
  type ClassMemberRow,
  type RosterStudentOption,
} from "@/actions/class-members";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { selectClassName } from "../labels";

export function ClassRoster({
  classId,
  initialMembers,
  students,
}: {
  classId: string;
  initialMembers: ClassMemberRow[];
  students: RosterStudentOption[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [selectedId, setSelectedId] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  const enrolledIds = useMemo(
    () => new Set(members.map((m) => m.member_id)),
    [members],
  );

  const available = useMemo(
    () => students.filter((s) => !enrolledIds.has(s.id)),
    [students, enrolledIds],
  );

  function handleAdd() {
    if (!selectedId) {
      toast.error("Selecione um membro.");
      return;
    }
    startTransition(async () => {
      const result = await addClassMember(classId, selectedId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSelectedId("");
      toast.success("Membro adicionado à turma.");
      router.refresh();
    });
  }

  function handleRemove(row: ClassMemberRow) {
    startTransition(async () => {
      const result = await removeClassMember(classId, row.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Membro removido.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum aluno inscrito nesta turma.
          </p>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2"
            >
              <p className="text-sm font-medium text-foreground">
                {member.member_name}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => handleRemove(member)}
                className="text-destructive hover:text-destructive"
              >
                Remover
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-3">
        <p className="text-sm font-medium text-foreground">Adicionar membro</p>
        <div className="space-y-2">
          <Label htmlFor="roster-member">Aluno ou responsável</Label>
          <select
            id="roster-member"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={selectClassName}
            disabled={pending || available.length === 0}
          >
            <option value="">
              {available.length === 0
                ? "Nenhum disponível"
                : "Selecione…"}
            </option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          disabled={pending || !selectedId}
          onClick={handleAdd}
          className="h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {pending ? "Salvando…" : "Adicionar"}
        </Button>
      </div>
    </div>
  );
}
