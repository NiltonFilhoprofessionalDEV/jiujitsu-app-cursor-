import { isPlatformAdminEmail } from "@/lib/platform-admin/index";
import { createClient } from "@/lib/supabase/server";

export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    throw new Error("forbidden");
  }

  return user;
}
