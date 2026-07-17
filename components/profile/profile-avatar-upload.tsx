"use client";

import { useRef, useActionState, useEffect, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  uploadAvatar,
  type ProfileActionState,
} from "@/actions/profile";
import { AvatarCropFullscreen } from "@/components/profile/avatar-crop-fullscreen";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(uploadAvatar, null);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [state]);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  useEffect(() => {
    if (!cropSrc) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [cropSrc]);

  function closeCropper() {
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={pending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;

          if (!ALLOWED_TYPES.has(file.type)) {
            toast.error("Use uma imagem JPEG, PNG ou WebP.");
            event.target.value = "";
            return;
          }
          if (file.size > MAX_BYTES) {
            toast.error("A imagem deve ter no máximo 8 MB.");
            event.target.value = "";
            return;
          }

          setCropSrc((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
          });
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

      {cropSrc ? (
        <AvatarCropFullscreen
          imageSrc={cropSrc}
          busy={pending}
          onCancel={closeCropper}
          onConfirm={(file) => {
            const formData = new FormData();
            formData.set("avatar", file);
            formAction(formData);
            closeCropper();
          }}
        />
      ) : null}
    </div>
  );
}
