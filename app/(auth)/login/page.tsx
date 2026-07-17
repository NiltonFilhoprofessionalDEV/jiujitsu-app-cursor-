import { LoginForm } from "./login-form";

type SearchParams = Promise<{ next?: string }>;

export default async function LoginPage({
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
        <p className="text-2xl font-bold tracking-tight text-foreground">
          BJJ Manager
        </p>
        <h1 className="text-lg font-medium text-muted-foreground">
          Entrar na sua conta
        </h1>
      </header>
      <LoginForm next={next} />
    </div>
  );
}
