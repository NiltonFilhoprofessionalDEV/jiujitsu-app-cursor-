import { cache } from "react";
import type { Capability, MemberRole } from "@/types/domain";
import { can } from "@/lib/permissions/capabilities";
import { createClient } from "@/lib/supabase/server";
import { getActiveAcademyId } from "@/lib/academy/context";

export class PermissionError extends Error {
  readonly role: MemberRole;
  readonly capability: Capability;

  constructor(role: MemberRole, capability: Capability) {
    super(`Role "${role}" lacks capability "${capability}"`);
    this.name = "PermissionError";
    this.role = role;
    this.capability = capability;
  }
}

export function assertCan(role: MemberRole, capability: Capability): void {
  if (!can(role, capability)) {
    throw new PermissionError(role, capability);
  }
}

export type ActiveMembership = {
  id: string;
  academy_id: string;
  profile_id: string;
  role: MemberRole;
  status: "active";
};

/** Dedupes membership lookups within a single RSC request. */
export const getActiveMembership = cache(
  async (): Promise<ActiveMembership> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const academyId = await getActiveAcademyId();
    if (!academyId) {
      throw new Error("No active academy");
    }

    const { data: member, error } = await supabase
      .from("academy_members")
      .select("id, academy_id, profile_id, role, status, academies(is_active)")
      .eq("profile_id", user.id)
      .eq("academy_id", academyId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!member) {
      throw new Error("Active membership not found");
    }

    const academy = member.academies as
      | { is_active: boolean }
      | { is_active: boolean }[]
      | null;
    const academyRow = Array.isArray(academy) ? academy[0] : academy;
    if (academyRow && academyRow.is_active === false) {
      throw new Error("Academy suspended");
    }

    return {
      id: member.id as string,
      academy_id: member.academy_id as string,
      profile_id: member.profile_id as string,
      role: member.role as MemberRole,
      status: "active",
    };
  },
);

export async function assertCapability(
  capability: Capability,
): Promise<ActiveMembership> {
  const member = await getActiveMembership();
  assertCan(member.role, capability);
  return member;
}
