import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateAcademyForm } from "./create-academy-form";
import { profileCanCreateAcademy } from "@/lib/academy/create-access";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { createClient } from "@/lib/supabase/server";

export default async function CreateAcademyPage() {
  const allowed = await profileCanCreateAcademy();
  if (!allowed) {
    redirect("/waiting-academy");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = isPlatformAdminEmail(user?.email);

  return (
    <>
      {isAdmin ? (
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Conta de platform admin.{" "}
          <Link
            href="/admin"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Ir para o painel admin
          </Link>
        </p>
      ) : null}
      <CreateAcademyForm />
    </>
  );
}
