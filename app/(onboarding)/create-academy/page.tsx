import { redirect } from "next/navigation";
import { CreateAcademyForm } from "./create-academy-form";
import { profileCanCreateAcademy } from "@/lib/academy/create-access";

export default async function CreateAcademyPage() {
  const allowed = await profileCanCreateAcademy();
  if (!allowed) {
    redirect("/waiting-academy");
  }

  return <CreateAcademyForm />;
}
