import { SignupForm } from "./signup-form";

type SearchParams = Promise<{ next?: string }>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next =
    typeof params.next === "string" && params.next.startsWith("/invite/")
      ? params.next
      : undefined;

  return (
    <div className="flex flex-1 flex-col justify-center gap-8">
      <header className="space-y-2 text-center">
        <p className="font-display text-4xl tracking-[0.08em] text-foreground">
          BJJ Manager
        </p>
        <h1 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Criar sua conta
        </h1>
      </header>
      <SignupForm next={next} />
    </div>
  );
}
