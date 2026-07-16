import Link from "next/link";
import { listMyAcademies } from "@/actions/academies";
import { SelectAcademyList } from "./select-academy-list";

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

      <SelectAcademyList academies={academies} />

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
