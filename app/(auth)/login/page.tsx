import { BrandWordmark } from "@/components/brand/brand-wordmark";
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
    <div className="flex flex-1 flex-col justify-center gap-10">
      <header className="space-y-4 text-center">
        <BrandWordmark />
        <div className="auth-rise auth-rise-delay mx-auto h-px w-16 bg-[var(--action-red)]" />
        <h1 className="auth-rise auth-rise-delay-2 text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Entrar na sua conta
        </h1>
      </header>
      <LoginForm next={next} />
    </div>
  );
}
