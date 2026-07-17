"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || iosStandalone;
}

function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallAppButton({
  className,
  variant = "secondary",
}: {
  className?: string;
  variant?: "secondary" | "outline";
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneDisplay());
    setIos(isIosDevice());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success("App instalado no seu celular.");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleInstall() {
    if (deferred) {
      setPending(true);
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") {
          setInstalled(true);
        }
        setDeferred(null);
      } catch {
        toast.error("Não foi possível abrir a instalação agora.");
      } finally {
        setPending(false);
      }
      return;
    }

    if (ios) {
      setShowIosHelp((open) => !open);
      return;
    }

    toast.message("Para instalar", {
      description:
        "No Chrome ou Edge, abra o menu do navegador e toque em “Instalar app” ou “Adicionar à tela inicial”.",
    });
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Button
        type="button"
        variant={variant === "outline" ? "outline" : "secondary"}
        disabled={pending}
        onClick={handleInstall}
        className="h-12 w-full gap-2 border border-border bg-secondary/80 text-foreground backdrop-blur-md hover:bg-secondary"
      >
        {ios ? (
          <Share className="h-4 w-4 text-[var(--action-red)]" />
        ) : (
          <Download className="h-4 w-4 text-[var(--action-red)]" />
        )}
        {pending
          ? "Abrindo instalação…"
          : ios
            ? "Instalar no iPhone"
            : deferred
              ? "Instalar app no celular"
              : "Instalar app no celular"}
      </Button>

      {showIosHelp ? (
        <div
          role="region"
          aria-label="Como instalar no iPhone"
          className="rounded-xl border border-border bg-card/80 px-4 py-3 text-left text-sm text-muted-foreground backdrop-blur-md"
        >
          <p className="flex items-start gap-2 font-medium text-foreground">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--action-red)]" />
            Adicionar à Tela de Início
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            <li>
              Toque em <span className="text-foreground">Compartilhar</span>{" "}
              (ícone de seta para cima no Safari).
            </li>
            <li>
              Escolha{" "}
              <span className="text-foreground">Adicionar à Tela de Início</span>
              .
            </li>
            <li>
              Confirme em <span className="text-foreground">Adicionar</span>.
            </li>
          </ol>
        </div>
      ) : null}
    </div>
  );
}
