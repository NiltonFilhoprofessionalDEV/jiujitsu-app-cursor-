import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";

export async function HeaderUserAvatar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.name ?? user.email ?? "Usuário";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <Link
      href="/profile"
      className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-red)]/50"
      aria-label="Abrir perfil"
      title="Perfil"
    >
      <Avatar
        size="default"
        className="size-11 border border-border bg-card shadow-[var(--surface-shadow)]"
      >
        {profile?.avatar_url ? (
          <AvatarImage src={profile.avatar_url} alt={displayName} />
        ) : null}
        <AvatarFallback className="bg-[var(--action-red)]/20 font-display text-sm text-[var(--action-red)]">
          {initial}
        </AvatarFallback>
      </Avatar>
    </Link>
  );
}
