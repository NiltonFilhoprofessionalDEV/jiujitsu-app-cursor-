"use server";

import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform-admin/require";
import type {
  PlatformAcademyDetails,
  PlatformAcademyListItem,
  PlatformMemberRow,
} from "@/lib/platform-admin/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MemberRole, MemberStatus } from "@/types/domain";

export type {
  PlatformAdminActionState,
  PlatformAcademyDetails,
  PlatformAcademyListItem,
  PlatformMemberRow,
} from "@/lib/platform-admin/types";

export async function assertPlatformAdminAccess(): Promise<void> {
  try {
    await requirePlatformAdmin();
  } catch {
    redirect("/home");
  }
}

export async function listPlatformAcademies(): Promise<PlatformAcademyListItem[]> {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data: academies, error } = await admin
    .from("academies")
    .select(
      "id, name, city, state, email, is_active, suspension_reason, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = academies ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((a) => a.id as string);

  const [{ data: members }, { data: counts }] = await Promise.all([
    admin
      .from("academy_members")
      .select("academy_id, role, status, profiles(name, email)")
      .in("academy_id", ids)
      .eq("role", "owner"),
    admin.from("academy_members").select("academy_id").in("academy_id", ids),
  ]);

  const ownerByAcademy = new Map<
    string,
    { name: string | null; email: string | null }
  >();
  for (const m of members ?? []) {
    const profile = m.profiles as
      | { name: string | null; email: string | null }
      | { name: string | null; email: string | null }[]
      | null;
    const p = Array.isArray(profile) ? profile[0] : profile;
    if (!ownerByAcademy.has(m.academy_id as string)) {
      ownerByAcademy.set(m.academy_id as string, {
        name: p?.name ?? null,
        email: p?.email ?? null,
      });
    }
  }

  const countByAcademy = new Map<string, number>();
  for (const m of counts ?? []) {
    const id = m.academy_id as string;
    countByAcademy.set(id, (countByAcademy.get(id) ?? 0) + 1);
  }

  return rows.map((a) => {
    const owner = ownerByAcademy.get(a.id as string);
    return {
      id: a.id as string,
      name: a.name as string,
      city: (a.city as string | null) ?? null,
      state: (a.state as string | null) ?? null,
      email: (a.email as string | null) ?? null,
      isActive: Boolean(a.is_active),
      suspensionReason: (a.suspension_reason as string | null) ?? null,
      createdAt: a.created_at as string,
      ownerName: owner?.name ?? null,
      ownerEmail: owner?.email ?? null,
      memberCount: countByAcademy.get(a.id as string) ?? 0,
    };
  });
}

export async function getPlatformAcademy(
  academyId: string,
): Promise<PlatformAcademyDetails | null> {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("academies")
    .select(
      "id, name, phone, email, instagram, city, state, address, description, timezone, is_active, suspension_reason, created_at, updated_at",
    )
    .eq("id", academyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id as string,
    name: data.name as string,
    phone: (data.phone as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    instagram: (data.instagram as string | null) ?? null,
    city: (data.city as string | null) ?? null,
    state: (data.state as string | null) ?? null,
    address: (data.address as string | null) ?? null,
    description: (data.description as string | null) ?? null,
    timezone:
      ((data.timezone as string | null) ?? undefined) || "America/Sao_Paulo",
    isActive: Boolean(data.is_active),
    suspensionReason: (data.suspension_reason as string | null) ?? null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export async function listPlatformAcademyMembers(
  academyId: string,
): Promise<PlatformMemberRow[]> {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("academy_members")
    .select("id, role, status, joined_at, profiles(name, email)")
    .eq("academy_id", academyId)
    .order("joined_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const profile = row.profiles as
      | { name: string | null; email: string | null }
      | { name: string | null; email: string | null }[]
      | null;
    const p = Array.isArray(profile) ? profile[0] : profile;
    return {
      id: row.id as string,
      role: row.role as MemberRole,
      status: row.status as MemberStatus,
      name: p?.name ?? null,
      email: p?.email ?? null,
      joinedAt: (row.joined_at as string | null) ?? null,
    };
  });
}
