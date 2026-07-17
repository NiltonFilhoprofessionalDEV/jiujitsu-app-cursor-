"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("app-error", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <BlackBeltTitle className="font-display text-2xl tracking-[0.08em] text-foreground">
        Não foi possível abrir
      </BlackBeltTitle>
      <p className="max-w-sm text-base text-muted-foreground">
        O app encontrou um erro ao carregar. Tente de novo ou entre novamente.
      </p>
      <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground"
        >
          Tentar de novo
        </button>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card text-base font-medium"
        >
          Abrir início
        </Link>
        <Link
          href="/login"
          className="inline-flex h-12 items-center justify-center rounded-xl text-base font-medium text-muted-foreground"
        >
          Entrar de novo
        </Link>
      </div>
    </div>
  );
}
