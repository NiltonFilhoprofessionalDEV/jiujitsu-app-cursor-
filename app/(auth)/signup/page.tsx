import { BrandWordmark } from "@/components/brand/brand-wordmark";
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
    <div className="flex flex-1 flex-col justify-center gap-10">
      <header className="space-y-4 text-center">
        <BrandWordmark />
        <div className="auth-rise auth-rise-delay mx-auto h-px w-16 bg-[var(--action-red)]" />
        <div className="auth-rise auth-rise-delay-2 space-y-2">
          <h1 className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Criar sua conta
          </h1>
          <p className="mx-auto max-w-[22rem] text-sm leading-relaxed text-muted-foreground">
            Monte sua academia ou entre no time — tudo no mesmo app.
          </p>
        </div>
      </header>
      <SignupForm next={next} />
    </div>
  );
}
