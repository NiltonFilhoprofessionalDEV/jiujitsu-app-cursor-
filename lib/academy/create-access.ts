import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { createClient } from "@/lib/supabase/server";

export async function profileCanCreateAcademy(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("profiles")
    .select("can_create_academy")
    .eq("id", user.id)
    .maybeSingle();

  if (data?.can_create_academy) return true;

  // Platform admins can self-grant in the create action; UI may show the form.
  return isPlatformAdminEmail(user.email);
}
