import Link from "next/link";
import { notFound } from "next/navigation";
import {
  assertPlatformAdminAccess,
  getPlatformAcademy,
  listPlatformAcademyMembers,
} from "@/actions/platform-admin";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import { AcademyAdminForms } from "./academy-admin-forms";

type Params = Promise<{ id: string }>;

export default async function AdminAcademyDetailPage({
  params,
}: {
  params: Params;
}) {
  await assertPlatformAdminAccess();
  const { id } = await params;

  const [academy, members] = await Promise.all([
    getPlatformAcademy(id),
    listPlatformAcademyMembers(id),
  ]);

  if (!academy) {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium text-primary">Admin</p>
        <BlackBeltTitle className="font-display text-2xl tracking-[0.06em] text-foreground">
          {academy.name}
        </BlackBeltTitle>
        <p className="text-sm text-muted-foreground">
          Edite dados, suspenda o acesso e acompanhe quem administra.
        </p>
      </header>

      <AcademyAdminForms academy={academy} members={members} />

      <p className="space-x-4 text-center text-sm text-muted-foreground">
        <Link
          href="/admin/academies"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Todas as academias
        </Link>
        <Link
          href="/admin"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Painel admin
        </Link>
      </p>
    </div>
  );
}
