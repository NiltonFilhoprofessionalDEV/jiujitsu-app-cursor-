import Link from "next/link";
import { redirect } from "next/navigation";
import { listMyAcademies, selectAcademy } from "@/actions/academies";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import { getActiveAcademyId } from "@/lib/academy/context";
import { profileCanCreateAcademy } from "@/lib/academy/create-access";
import { SelectAcademyList } from "./select-academy-list";

export default async function SelectAcademyPage() {
  const academies = await listMyAcademies();
  const canCreate = await profileCanCreateAcademy();
  const activeId = await getActiveAcademyId();

  // Cookie lost but user has exactly one academy — restore and continue.
  if (academies.length === 1 && !activeId) {
    const result = await selectAcademy(academies[0].id);
    // selectAcademy redirects on success; if it returns, show the list with error.
    if (result?.error) {
      // fall through to render list
    }
  }

  // Already has a valid active academy in cookie — don't trap the user here.
  if (
    activeId &&
    academies.some((a) => a.id === activeId) &&
    academies.length === 1
  ) {
    redirect("/home");
  }

  const description =
    academies.length <= 1
      ? "Escolha a academia para continuar no app."
      : "Você pertence a mais de uma academia. Escolha com qual trabalhar.";

  return (
    <div className="flex flex-1 flex-col justify-center gap-8">
      <header className="space-y-2 text-center">
        <p className="text-2xl font-bold tracking-tight text-foreground">
          BJJ Pulse
        </p>
        <BlackBeltTitle className="text-lg font-medium text-muted-foreground">
          Selecione a academia
        </BlackBeltTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      <SelectAcademyList academies={academies} canCreate={canCreate} />

      {canCreate ? (
        <p className="text-center text-sm text-muted-foreground">
          Quer cadastrar outra?{" "}
          <Link
            href="/create-academy"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Nova academia
          </Link>
        </p>
      ) : null}
    </div>
  );
}
