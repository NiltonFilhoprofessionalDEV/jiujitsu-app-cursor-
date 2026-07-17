"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CreateInviteForm } from "./create-invite-form";
import { cn } from "@/lib/utils";

export function MembersInvitePanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-[var(--member-invite-wash)] shadow-[var(--surface-shadow)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-semibold text-foreground">
            Convidar pelo WhatsApp
          </p>
          <p className="text-xs text-muted-foreground">
            Gere um link para o aluno se cadastrar
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-border bg-card p-4">
          <CreateInviteForm compact />
        </div>
      ) : null}
    </div>
  );
}
