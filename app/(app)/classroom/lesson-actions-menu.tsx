"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteVirtualLesson } from "@/actions/classroom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function LessonActionsMenu({
  lessonId,
  title,
}: {
  lessonId: string;
  title: string;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  return (
    <>
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          aria-label="Opções do vídeo"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 min-w-[10.5rem] overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-[var(--surface-shadow)]"
          >
            <Link
              href={`/classroom/${lessonId}/edit`}
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-muted"
              onClick={() => setMenuOpen(false)}
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
              Editar
            </Link>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-destructive transition hover:bg-destructive/10"
              onClick={() => {
                setMenuOpen(false);
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </button>
          </div>
        ) : null}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir vídeo?</DialogTitle>
            <DialogDescription>
              “{title}” será removido da galeria. Essa ação não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => {
                startDelete(async () => {
                  const result = await deleteVirtualLesson(lessonId);
                  if (result?.error) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(result?.success ?? "Vídeo excluído.");
                  setDeleteOpen(false);
                  router.push("/classroom");
                  router.refresh();
                });
              }}
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
