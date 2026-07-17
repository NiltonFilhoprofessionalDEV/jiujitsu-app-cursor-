"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addLessonComment,
  deleteLessonComment,
  type ClassroomActionState,
  type VirtualLessonComment,
} from "@/actions/classroom";
import { Button } from "@/components/ui/button";

const initialState: ClassroomActionState = null;

function formatCommentDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CommentItem({
  comment,
  lessonId,
  depth = 0,
}: {
  comment: VirtualLessonComment;
  lessonId: string;
  depth?: number;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    addLessonComment,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      setReplyOpen(false);
    }
  }, [state]);

  return (
    <li className={depth > 0 ? "ml-4 border-l border-border pl-3 sm:ml-6" : ""}>
      <div className="rounded-xl border border-border bg-background/40 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">
              {comment.author_name}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {comment.body}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <p className="text-[10px] text-muted-foreground">
                {formatCommentDate(comment.created_at)}
              </p>
              {depth === 0 ? (
                <button
                  type="button"
                  className="text-[10px] font-medium text-[var(--action-red)] hover:underline"
                  onClick={() => setReplyOpen((open) => !open)}
                >
                  {replyOpen ? "Cancelar" : "Responder"}
                </button>
              ) : null}
            </div>
          </div>
          {comment.is_own ? (
            <form
              action={async () => {
                const result = await deleteLessonComment(comment.id, lessonId);
                if (result?.error) toast.error(result.error);
                else if (result?.success) toast.success(result.success);
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

        {replyOpen ? (
          <form action={formAction} className="mt-3 space-y-2">
            <input type="hidden" name="lesson_id" value={lessonId} />
            <input type="hidden" name="parent_id" value={comment.id} />
            <textarea
              name="body"
              rows={2}
              required
              maxLength={1000}
              autoFocus
              placeholder={`Responder a ${comment.author_name}…`}
              className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <Button type="submit" size="sm" className="h-8" disabled={pending}>
              {pending ? "Enviando…" : "Responder"}
            </Button>
          </form>
        ) : null}
      </div>

      {comment.replies.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              lessonId={lessonId}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

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

  const totalCount =
    comments.length +
    comments.reduce((acc, comment) => acc + comment.replies.length, 0);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)]">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Comentários ({totalCount})
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Dúvidas e discussões só da academia · responda como no YouTube
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
            <CommentItem
              key={comment.id}
              comment={comment}
              lessonId={lessonId}
            />
          ))
        )}
      </ul>
    </section>
  );
}
