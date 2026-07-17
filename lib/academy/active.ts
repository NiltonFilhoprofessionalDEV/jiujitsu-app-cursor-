import { getActiveMembership } from "@/lib/permissions/assert";
import { createClient } from "@/lib/supabase/server";

export type ActiveAcademyBrief = {
  id: string;
  name: string;
};

export async function getActiveAcademyBrief(): Promise<ActiveAcademyBrief> {
  const membership = await getActiveMembership();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academies")
    .select("id, name")
    .eq("id", membership.academy_id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Active academy not found");
  }

  return {
    id: data.id as string,
    name: data.name as string,
  };
}
