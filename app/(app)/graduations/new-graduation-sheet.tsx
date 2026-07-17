"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  NewGraduationForm,
  type GraduationMemberOption,
} from "./new-graduation-form";

export function NewGraduationSheet({
  members,
  defaultMemberId,
  defaultOpen = false,
}: {
  members: GraduationMemberOption[];
  defaultMemberId?: string;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen, defaultMemberId]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && (defaultOpen || defaultMemberId)) {
      router.replace("/graduations");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed z-40 inline-flex items-center gap-2 rounded-full",
          "bg-[var(--page-fab-bg)] px-5 py-3.5",
          "text-sm font-semibold tracking-wide text-[var(--page-fab-fg)]",
          "shadow-[var(--page-fab-shadow)]",
          "transition-[transform,box-shadow,filter] duration-200",
          "hover:brightness-110 active:scale-[0.97]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--page-fab-bg)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4",
          "lg:bottom-8 lg:right-8",
        )}
        aria-label="Nova graduação"
      >
        <Plus className="h-5 w-5 stroke-[2.5]" aria-hidden />
        <span>Nova</span>
      </button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[90dvh] max-w-lg gap-0 overflow-y-auto rounded-t-2xl border-border bg-popover pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[var(--page-fab-shadow)]"
          overlayClassName="bg-black/55 supports-backdrop-filter:backdrop-blur-sm"
          showCloseButton
        >
          <SheetHeader className="border-b border-border px-4 pb-3 pt-4">
            <SheetTitle>Nova graduação</SheetTitle>
            <SheetDescription>
              Escolha o aluno. Faixa e grau são sugeridos automaticamente.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 py-4">
            {open ? (
              <NewGraduationForm
                key={defaultMemberId ?? "new-graduation"}
                members={members}
                defaultMemberId={defaultMemberId}
                onSuccess={() => handleOpenChange(false)}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
