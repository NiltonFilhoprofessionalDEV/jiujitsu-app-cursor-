import Link from "next/link";
import {
  assertPlatformAdminAccess,
  listPlatformAcademies,
} from "@/actions/platform-admin";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";

export default async function AdminAcademiesPage() {
  await assertPlatformAdminAccess();
  const academies = await listPlatformAcademies();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium text-primary">Admin</p>
        <BlackBeltTitle className="font-display text-2xl tracking-[0.06em] text-foreground">
          Academias
        </BlackBeltTitle>
        <p className="text-sm text-muted-foreground">
          Visão geral de todas as academias, donos e status de acesso.
        </p>
      </header>

      <div className="space-y-3">
        {academies.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Nenhuma academia cadastrada ainda.
          </p>
        ) : (
          academies.map((academy) => (
            <Link
              key={academy.id}
              href={`/admin/academies/${academy.id}`}
              className="block rounded-2xl border border-border bg-card p-4 shadow-xl backdrop-blur-xl transition hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {academy.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[academy.city, academy.state].filter(Boolean).join(" · ") ||
                      "Sem localização"}
                    {" · "}
                    {academy.memberCount} membros
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    Dono:{" "}
                    {academy.ownerName || academy.ownerEmail || "Não definido"}
                    {academy.ownerEmail ? ` (${academy.ownerEmail})` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    academy.isActive
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {academy.isActive ? "Ativa" : "Suspensa"}
                </span>
              </div>
              {!academy.isActive && academy.suspensionReason ? (
                <p className="mt-2 text-xs text-destructive">
                  Motivo: {academy.suspensionReason}
                </p>
              ) : null}
            </Link>
          ))
        )}
      </div>

      <p className="space-x-4 text-center text-sm text-muted-foreground">
        <Link
          href="/admin"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Painel admin
        </Link>
        <Link
          href="/admin/owner-invites"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Autorizar donos
        </Link>
      </p>
    </div>
  );
}
