import type { MemberRole, MemberStatus } from "@/types/domain";
import { BELT_OPTIONS } from "@/lib/validations/members";

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Proprietário",
  administrator: "Administrador",
  instructor: "Instrutor",
  assistant_instructor: "Instrutor auxiliar",
  student: "Aluno",
  guardian: "Responsável",
};

export const STATUS_LABELS: Record<MemberStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  suspended: "Suspenso",
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [
  MemberRole,
  string,
][];

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as [
  MemberStatus,
  string,
][];

export { BELT_OPTIONS };

export const selectClassName =
  "flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50";
