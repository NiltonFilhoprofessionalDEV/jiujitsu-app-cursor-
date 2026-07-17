"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  MoreVertical,
  Pencil,
  Phone,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import {
  deleteMember,
  type AcademyMemberRow,
  type MemberActionState,
} from "@/actions/members";
import { BeltPill } from "@/components/belts/belt-pill";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { digitsOnly, toWhatsAppE164 } from "@/lib/phone/whatsapp";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, STATUS_LABELS } from "./labels";

const initialState: MemberActionState = null;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function telHref(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = digitsOnly(phone);
  return digits.length >= 8 ? `tel:${digits}` : null;
}

function whatsappHref(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const e164 = toWhatsAppE164(phone);
  return e164 ? `https://wa.me/${e164}` : null;
}

function IconAction({
  href,
  label,
  disabled,
  className,
  children,
}: {
  href?: string | null;
  label: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex size-9 items-center justify-center rounded-full transition active:scale-95";

  if (!href || disabled) {
    return (
      <span
        aria-hidden
        title={label}
        className={cn(base, "text-muted-foreground/35", className)}
      >
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      aria-label={label}
      title={label}
      className={cn(base, className)}
    >
      {children}
    </a>
  );
}

export function MemberListCard({
  member,
  canManage = false,
}: {
  member: AcademyMemberRow;
  canManage?: boolean;
}) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const name = member.profile.name;
  const avatarUrl = member.profile.avatar_url;
  const memberTel = telHref(member.profile.phone);
  const emergencyTel = telHref(member.emergency_contact_phone);
  const memberWa = whatsappHref(member.profile.phone);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteMember,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      setConfirmOpen(false);
      setMenuOpen(false);
      void mutate(
        (key) => Array.isArray(key) && key[0] === "members:list",
        undefined,
        { revalidate: true },
      );
      router.refresh();
    }
  }, [state, router, mutate]);

  return (
    <>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-[var(--surface-shadow)]">
        <Link
          href={`/members/${member.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 transition active:scale-[0.99]"
        >
          <Avatar size="lg" className="size-10 shrink-0">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback className="bg-[var(--member-avatar-wash)] font-display text-xs tracking-wide text-foreground">
              {initials(name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {name}
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">
                {ROLE_LABELS[member.role]}
              </span>
              <span
                className={
                  member.status === "active"
                    ? "shrink-0 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400"
                    : member.status === "suspended"
                      ? "shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-400"
                      : "shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                }
              >
                {STATUS_LABELS[member.status]}
              </span>
              {!member.has_app_access ? (
                <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
                  Sem acesso
                </span>
              ) : null}
            </div>
          </div>
        </Link>

        <div className="flex w-[6.75rem] shrink-0 justify-end">
          {member.current_belt ? (
            <BeltPill
              belt={member.current_belt}
              degree={member.current_degree}
              className="max-w-full truncate"
            />
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconAction
            href={memberTel}
            label={`Ligar para ${name}`}
            disabled={!memberTel}
            className="text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Phone className="h-4 w-4" strokeWidth={1.75} />
          </IconAction>

          <IconAction
            href={emergencyTel}
            label={`Ligar emergência de ${name}`}
            disabled={!emergencyTel}
            className="text-amber-600/80 hover:bg-amber-500/10 hover:text-amber-600 dark:text-amber-400/80 dark:hover:text-amber-400"
          >
            <ShieldAlert className="h-4 w-4" strokeWidth={1.75} />
          </IconAction>

          <IconAction
            href={memberWa}
            label={`WhatsApp de ${name}`}
            disabled={!memberWa}
            className="text-[#25D366]/90 hover:bg-[#25D366]/10 hover:text-[#1da851]"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
          </IconAction>

          {canManage ? (
            <button
              type="button"
              aria-label={`Mais ações de ${name}`}
              onClick={() => setMenuOpen(true)}
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
            >
              <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
      </div>

      {canManage ? (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            side="bottom"
            className="mx-auto max-w-lg gap-0 rounded-t-2xl border-border bg-popover pb-[max(1rem,env(safe-area-inset-bottom))]"
            showCloseButton
          >
            <SheetHeader className="border-b border-border px-4 pb-3 pt-4">
              <SheetTitle>{name}</SheetTitle>
              <SheetDescription>Gerenciar membro</SheetDescription>
            </SheetHeader>
            <div className="space-y-1 px-2 py-3">
              <Link
                href={`/members/${member.id}`}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
                onClick={() => setMenuOpen(false)}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-destructive transition hover:bg-destructive/10"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Apagar
              </button>
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="gap-5 bg-popover p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apagar membro?</DialogTitle>
            <DialogDescription>
              Remover <strong>{name}</strong> da academia? Se houver histórico
              de presença, o cadastro será só inativado para preservar os
              registros.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="grid grid-cols-2 gap-2">
            <input type="hidden" name="id" value={member.id} />
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="h-11"
              disabled={pending}
            >
              {pending ? "Apagando…" : "Apagar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
