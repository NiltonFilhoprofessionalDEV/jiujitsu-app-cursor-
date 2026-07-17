"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  addLessonComment,
  deleteLessonComment,
  type ClassroomActionState,
  type VirtualLessonComment,
} from "@/actions/classroom";
import { Button } from "@/components/ui/button";

const initialState: ClassroomActionState = null;

export function LessonComments({
  lessonId,
  comments,
}: {
  lessonId: string;
  comments: VirtualLessonComment[];
}) {
  const [state, formAction, pending] = useActionState(
    addLessonComment,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)]">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Comentários</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Dúvidas e discussões só da academia
        </p>
      </div>

      <form action={formAction} className="space-y-2">
        <input type="hidden" name="lesson_id" value={lessonId} />
        <textarea
          name="body"
          rows={3}
          required
          maxLength={1000}
          placeholder="Pergunte ao professor ou comente a técnica…"
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <Button type="submit" className="h-10 w-full" disabled={pending}>
          {pending ? "Enviando…" : "Comentar"}
        </Button>
      </form>

      <ul className="space-y-3">
        {comments.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            Ainda não há comentários neste vídeo.
          </li>
        ) : (
          comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-xl border border-border bg-background/40 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    {comment.author_name}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {comment.body}
                  </p>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {new Date(comment.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {comment.is_own ? (
                  <form
                    action={async () => {
                      const result = await deleteLessonComment(
                        comment.id,
                        lessonId,
                      );
                      if (result?.error) toast.error(result.error);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Apagar
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
