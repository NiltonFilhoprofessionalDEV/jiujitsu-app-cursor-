import { redirect } from "next/navigation";
import { defaultAppHomePath } from "@/lib/journey/nav";
import { getActiveMembership } from "@/lib/permissions/assert";

export default async function RootPage() {
  try {
    const membership = await getActiveMembership();
    redirect(defaultAppHomePath(membership.role));
  } catch {
    redirect("/login");
  }
}
