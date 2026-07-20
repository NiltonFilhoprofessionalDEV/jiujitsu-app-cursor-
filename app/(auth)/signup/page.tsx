import Link from "next/link";
import { getInvitePreview } from "@/actions/invites";
import { getOwnerInvitePreview } from "@/actions/owner-invites";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { SignupForm } from "./signup-form";

type SearchParams = Promise<{ next?: string }>;

function isInviteNext(next: string | undefined): next is string {
  return (
    typeof next === "string" &&
    (next.startsWith("/invite/") || next.startsWith("/owner-invite/"))
  );
}

function memberInviteTokenFromNext(next: string): string | null {
  if (!next.startsWith("/invite/")) return null;
  return next.slice("/invite/".length).split("/")[0]?.trim() || null;
}

function ownerInviteTokenFromNext(next: string): string | null {
  if (!next.startsWith("/owner-invite/")) return null;
  return next.slice("/owner-invite/".length).split("/")[0]?.trim() || null;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next = isInviteNext(params.next) ? params.next : undefined;

  let lockedEmail: string | null = null;
  let suggestedName: string | null = null;

  const memberToken = next ? memberInviteTokenFromNext(next) : null;
  if (memberToken) {
    const preview = await getInvitePreview(memberToken);
    if (preview?.isValid) {
      lockedEmail = preview.expectedEmail;
      suggestedName = preview.inviteeName;
    }
  }

  const ownerToken = next ? ownerInviteTokenFromNext(next) : null;
  if (ownerToken) {
    const preview = await getOwnerInvitePreview(ownerToken);
    if (preview?.isValid && preview.expectedEmail) {
      lockedEmail = preview.expectedEmail;
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-10">
      <header className="space-y-4 text-center">
        <BrandWordmark />
        <div className="auth-rise auth-rise-delay mx-auto h-px w-16 bg-[var(--action-red)]" />
        <div className="auth-rise auth-rise-delay-2 space-y-2">
          <BlackBeltTitle className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {next ? "Criar sua conta" : "Cadastro fechado"}
          </BlackBeltTitle>
          <p className="mx-auto max-w-[22rem] text-sm leading-relaxed text-muted-foreground">
            {next
              ? lockedEmail
                ? next.startsWith("/owner-invite/")
                  ? `Use o e-mail autorizado: ${lockedEmail}`
                  : `Use o e-mail cadastrado pela academia: ${lockedEmail}`
                : "Complete seu cadastro para aceitar o convite."
              : "Novas contas só com link de convite da academia. Peça o link ao professor ou à secretaria."}
          </p>
        </div>
      </header>

      {next ? (
        <SignupForm
          next={next}
          lockedEmail={lockedEmail}
          defaultName={suggestedName}
        />
      ) : (
        <div className="auth-rise auth-rise-delay-2 space-y-5">
          <div className="auth-panel space-y-4 rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Se você já tem conta, entre normalmente.
            </p>
            <Link
              href="/login"
              className="flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Ir para o login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
