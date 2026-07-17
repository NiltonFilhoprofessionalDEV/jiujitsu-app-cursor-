"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import {
  removePushSubscriptions,
  savePushSubscription,
} from "@/actions/push";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushReminderToggle({
  initialSubscribed,
  publicKey,
  configured,
}: {
  initialSubscribed: boolean;
  publicKey: string | null;
  configured: boolean;
}) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [pending, startTransition] = useTransition();
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window,
    );
  }, []);

  useEffect(() => {
    setSubscribed(initialSubscribed);
  }, [initialSubscribed]);

  if (!configured || !publicKey) {
    return (
      <section className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Lembretes push ainda não configurados no servidor (chaves VAPID).
      </section>
    );
  }

  if (!supported) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Este navegador não suporta notificações push. No iPhone, adicione o app
        à Tela de Início (Safari) e ative por lá.
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)]">
      <div className="flex items-start gap-3">
        {subscribed ? (
          <Bell className="mt-0.5 h-5 w-5 text-[var(--action-red)]" />
        ) : (
          <BellOff className="mt-0.5 h-5 w-5 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">
            Lembrete de treino
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Receba um push no celular 1 hora antes da sua aula.
          </p>
        </div>
      </div>

      <Button
        type="button"
        disabled={pending}
        className="h-11 w-full"
        variant={subscribed ? "outline" : "default"}
        onClick={() => {
          startTransition(async () => {
            try {
              if (subscribed) {
                const registration = await navigator.serviceWorker.ready;
                const sub = await registration.pushManager.getSubscription();
                if (sub) await sub.unsubscribe();
                const result = await removePushSubscriptions();
                if (result?.error) {
                  toast.error(result.error);
                  return;
                }
                setSubscribed(false);
                toast.success(result?.success ?? "Lembretes desativados.");
                return;
              }

              const permission = await Notification.requestPermission();
              if (permission !== "granted") {
                toast.error("Permissão de notificação negada.");
                return;
              }

              const registration = await navigator.serviceWorker.ready;
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
              });

              const json = subscription.toJSON();
              if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
                toast.error("Não foi possível criar a assinatura push.");
                return;
              }

              const result = await savePushSubscription({
                endpoint: json.endpoint,
                keys: {
                  p256dh: json.keys.p256dh,
                  auth: json.keys.auth,
                },
                userAgent: navigator.userAgent,
              });

              if (result?.error) {
                toast.error(result.error);
                return;
              }

              setSubscribed(true);
              toast.success(result?.success ?? "Lembretes ativados.");
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : "Falha ao configurar notificações.",
              );
            }
          });
        }}
      >
        {pending
          ? "Aguarde…"
          : subscribed
            ? "Desativar lembretes"
            : "Ativar lembretes"}
      </Button>
    </section>
  );
}
