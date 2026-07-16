import Link from "next/link";
import {
  listMyAcademies,
  selectAcademyFromForm,
} from "@/actions/academies";
import { Button } from "@/components/ui/button";

export default async function SelectAcademyPage() {
  const academies = await listMyAcademies();

  return (
    <div className="flex flex-1 flex-col justify-center gap-8">
      <header className="space-y-2 text-center">
        <p className="text-2xl font-bold tracking-tight text-foreground">
          BJJ Manager
        </p>
        <h1 className="text-lg font-medium text-muted-foreground">
          Selecione a academia
        </h1>
        <p className="text-sm text-muted-foreground">
          Você pertence a mais de uma academia. Escolha com qual trabalhar.
        </p>
      </header>

      <div className="space-y-3">
        {academies.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
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
              action={selectAcademyFromForm}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur-xl"
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
                    {academy.role}
                  </p>
                </div>
                <Button
                  type="submit"
                  className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Entrar
                </Button>
              </div>
            </form>
          ))
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Quer cadastrar outra?{" "}
        <Link
          href="/create-academy"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Nova academia
        </Link>
      </p>
    </div>
  );
}
