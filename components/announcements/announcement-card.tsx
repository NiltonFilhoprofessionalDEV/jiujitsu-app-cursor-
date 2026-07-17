"use client";

import {
  useActionState,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { ChevronDown, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteAnnouncement,
  markAnnouncementRead,
  updateAnnouncement,
  type AnnouncementActionState,
} from "@/actions/announcements";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PREVIEW_CHARS = 160;

export function AnnouncementCard({
  id,
  title,
  description,
  createdAtLabel,
  authorName,
  turmaName = null,
  classId = null,
  initialRead,
  canManage = false,
}: {
  id: string;
  title: string;
  description: string;
  createdAtLabel: string;
  authorName: string;
  turmaName?: string | null;
  classId?: string | null;
  initialRead: boolean;
  canManage?: boolean;
}) {
  const [isRead, setIsRead] = useState(initialRead);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  const needsExpand = description.length > PREVIEW_CHARS;
  const preview = needsExpand
    ? `${description.slice(0, PREVIEW_CHARS).trimEnd()}…`
    : description;

  const onDocPointer = useEffectEvent((event: MouseEvent) => {
    if (!menuRef.current?.contains(event.target as Node)) {
      setMenuOpen(false);
    }
  });

  useEffect(() => {
    if (!menuOpen) return;
    document.addEventListener("mousedown", onDocPointer);
    return () => document.removeEventListener("mousedown", onDocPointer);
  }, [menuOpen, onDocPointer]);

  useEffect(() => {
    setIsRead(initialRead);
  }, [initialRead]);

  function markRead() {
    if (isRead || pending) return;
    setIsRead(true);
    startTransition(async () => {
      const result = await markAnnouncementRead(id);
      if (result?.error) setIsRead(false);
    });
  }

  return (
    <>
      <article
        className={cn(
          "relative w-full rounded-2xl border p-4 text-left shadow-[var(--surface-shadow)] transition",
          isRead
            ? "border-border bg-card"
            : "border-[var(--inbox-unread-border)] bg-[var(--inbox-unread-bg)]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              disabled={pending || isRead}
              onClick={markRead}
              className={cn(
                "w-full text-left",
                !isRead && "cursor-pointer",
              )}
            >
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-foreground">{title}</h2>
                {!isRead ? (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-[var(--inbox-dot)]"
                    aria-label="Não lido"
                  />
                ) : null}
              </div>
              {turmaName ? (
                <p className="mt-1 text-[11px] font-medium text-[var(--action-red)]">
                  {turmaName}
                </p>
              ) : null}
            </button>

            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {expanded || !needsExpand ? description : preview}
            </p>

            {needsExpand ? (
              <button
                type="button"
                onClick={() => {
                  setExpanded((value) => !value);
                  markRead();
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--action-red)]"
              >
                {expanded ? "Ver menos" : "Ver mais"}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition",
                    expanded && "rotate-180",
                  )}
                />
              </button>
            ) : null}

            <p className="mt-3 text-[10px] text-muted-foreground">
              Por {authorName} · {createdAtLabel}
            </p>
          </div>

          {canManage ? (
            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                aria-label="Opções do aviso"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-1 min-w-[10.5rem] overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-[var(--surface-shadow)]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-muted"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    Editar
                  </button>
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
                    Apagar
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>

      {canManage ? (
        <>
          <EditAnnouncementDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            id={id}
            title={title}
            description={description}
            classId={classId}
          />
          <DeleteAnnouncementDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title={title}
            deleting={deleting}
            onConfirm={() => {
              startDelete(async () => {
                const result = await deleteAnnouncement(id);
                if (result?.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success(result?.success ?? "Aviso removido.");
                setDeleteOpen(false);
              });
            }}
          />
        </>
      ) : null}
    </>
  );
}

function DeleteAnnouncementDialog({
  open,
  onOpenChange,
  title,
  deleting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  deleting: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 bg-popover p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apagar aviso?</DialogTitle>
          <DialogDescription>
            “{title}” será removido. Essa ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-11"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? "Apagando…" : "Apagar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditAnnouncementDialog({
  open,
  onOpenChange,
  id,
  title,
  description,
  classId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  title: string;
  description: string;
  classId: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    AnnouncementActionState,
    FormData
  >(updateAnnouncement, null);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 bg-popover p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar aviso</DialogTitle>
          <DialogDescription>
            Altere o título ou o texto do comunicado.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="class_id" value={classId ?? ""} />
          <div className="space-y-2">
            <Label htmlFor={`edit-title-${id}`}>Título</Label>
            <Input
              id={`edit-title-${id}`}
              name="title"
              required
              defaultValue={title}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-description-${id}`}>Descrição</Label>
            <textarea
              id={`edit-description-${id}`}
              name="description"
              required
              rows={4}
              defaultValue={description}
              className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="h-11 flex-1" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
