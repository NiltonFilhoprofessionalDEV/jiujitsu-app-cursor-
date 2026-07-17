"use client";

import { useRef, useActionState, useEffect } from "react";
import { Camera, Loader2 } from "lucide-react";
import {
  uploadAvatar,
  type ProfileActionState,
} from "@/actions/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ProfileAvatarUpload({
  name,
  avatarUrl,
  initial,
}: {
  name: string;
  avatarUrl: string | null;
  initial: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(uploadAvatar, null);

  useEffect(() => {
    if (state?.success && inputRef.current) {
      inputRef.current.value = "";
    }
  }, [state?.success]);

  return (
    <div className="flex flex-col items-start gap-2">
      <form action={formAction}>
        <input
          ref={inputRef}
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            event.currentTarget.form?.requestSubmit();
          }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-red)]/50 disabled:opacity-60"
          aria-label="Alterar foto de perfil"
          title="Alterar foto"
        >
          <Avatar
            size="lg"
            className="size-14 after:border-[var(--action-red)]/30"
          >
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
            <AvatarFallback className="bg-[var(--action-red)]/20 font-display text-xl text-[var(--action-red)]">
              {initial}
            </AvatarFallback>
          </Avatar>
          {pending ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </span>
          ) : (
            <span className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border-2 border-card bg-[var(--action-red)] text-primary-foreground shadow-sm">
              <Camera className="h-3 w-3" />
            </span>
          )}
        </button>
      </form>
      {state?.error ? (
        <p className="text-xs text-[var(--bjj-danger)]" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-xs text-muted-foreground">{state.success}</p>
      ) : null}
    </div>
  );
}
