"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setActiveAcademyId } from "@/lib/academy/context";
import {
  assertCapability,
  getActiveMembership,
  PermissionError,
} from "@/lib/permissions/assert";
import { createClient } from "@/lib/supabase/server";
import {
  createAcademySchema,
  createUnitSchema,
  updateAcademySchema,
  updateUnitSchema,
} from "@/lib/validations/academy";
import type { MemberRole } from "@/types/domain";

export type AcademyActionState = {
  error?: string;
  success?: string;
} | null;

export type MyAcademy = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  role: MemberRole;
};

export type AcademyUnit = {
  id: string;
  academy_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  is_active: boolean;
  timezone: string | null;
};

export type AcademyDetails = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  description: string | null;
  timezone: string;
};

function firstValidationError(error: {
  flatten: () => {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  };
}): string {
  const flat = error.flatten();
  const fieldMessage = Object.values(flat.fieldErrors).flat().find(Boolean);
  return fieldMessage ?? flat.formErrors[0] ?? "Dados inválidos";
}

function formOptional(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function assertOwnerOrAdmin() {
  const member = await getActiveMembership();
  if (member.role !== "owner" && member.role !== "administrator") {
    throw new PermissionError(member.role, "manage_academy");
  }
  return member;
}

export async function createAcademy(
  _prevState: AcademyActionState,
  formData: FormData,
): Promise<AcademyActionState> {
  const parsed = createAcademySchema.safeParse({
    name: formData.get("name"),
    phone: formOptional(formData, "phone"),
    email: formOptional(formData, "email"),
    instagram: formOptional(formData, "instagram"),
    city: formOptional(formData, "city"),
    state: formOptional(formData, "state"),
    address: formOptional(formData, "address"),
    description: formOptional(formData, "description"),
  });

  if (!parsed.success) {
    return { error: firstValidationError(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Faça login para criar uma academia." };
  }

  const { data: academyId, error } = await supabase.rpc(
    "create_academy_with_owner",
    {
      p_name: parsed.data.name,
      p_phone: parsed.data.phone ?? null,
      p_email: parsed.data.email ?? null,
      p_instagram: parsed.data.instagram ?? null,
      p_city: parsed.data.city ?? null,
      p_state: parsed.data.state ?? null,
      p_address: parsed.data.address ?? null,
      p_description: parsed.data.description ?? null,
    },
  );

  if (error || !academyId) {
    return {
      error:
        error?.message ??
        "Não foi possível criar a academia. Tente novamente.",
    };
  }

  await setActiveAcademyId(academyId as string);
  redirect("/home");
}

export async function listMyAcademies(): Promise<MyAcademy[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("academy_members")
    .select("role, academies(id, name, city, state)")
    .eq("profile_id", user.id)
    .eq("status", "active");

  if (error) {
    throw error;
  }

  return (data ?? []).flatMap((row) => {
    const academy = row.academies as
      | { id: string; name: string; city: string | null; state: string | null }
      | { id: string; name: string; city: string | null; state: string | null }[]
      | null;

    const item = Array.isArray(academy) ? academy[0] : academy;
    if (!item) return [];

    return [
      {
        id: item.id,
        name: item.name,
        city: item.city,
        state: item.state,
        role: row.role as MemberRole,
      },
    ];
  });
}

export type SelectAcademyState = {
  error?: string;
} | null;

export async function selectAcademy(
  academyId: string,
): Promise<{ error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: member, error } = await supabase
    .from("academy_members")
    .select("id")
    .eq("profile_id", user.id)
    .eq("academy_id", academyId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !member) {
    return { error: "Você não pertence a esta academia" };
  }

  await setActiveAcademyId(academyId);
  redirect("/home");
}

export async function selectAcademyFromForm(
  _prevState: SelectAcademyState,
  formData: FormData,
): Promise<SelectAcademyState> {
  const academyId = formData.get("academyId");
  if (typeof academyId !== "string" || !academyId) {
    return { error: "Academia inválida" };
  }
  return selectAcademy(academyId);
}

export async function getActiveAcademy(): Promise<AcademyDetails | null> {
  const member = await getActiveMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("academies")
    .select(
      "id, name, phone, email, instagram, city, state, address, description, timezone",
    )
    .eq("id", member.academy_id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;

  return {
    ...(data as AcademyDetails),
    timezone:
      ((data as { timezone?: string | null }).timezone as string | undefined) ??
      "America/Sao_Paulo",
  };
}

export async function updateAcademy(
  _prevState: AcademyActionState,
  formData: FormData,
): Promise<AcademyActionState> {
  try {
    const member = await assertCapability("manage_academy");

    const parsed = updateAcademySchema.safeParse({
      name: formData.get("name"),
      phone: formOptional(formData, "phone"),
      email: formOptional(formData, "email"),
      instagram: formOptional(formData, "instagram"),
      city: formOptional(formData, "city"),
      state: formOptional(formData, "state"),
      address: formOptional(formData, "address"),
      description: formOptional(formData, "description"),
      timezone: formOptional(formData, "timezone"),
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("academies")
      .update({
        name: parsed.data.name,
        phone: parsed.data.phone ?? null,
        email: parsed.data.email ?? null,
        instagram: parsed.data.instagram ?? null,
        city: parsed.data.city ?? null,
        state: parsed.data.state ?? null,
        address: parsed.data.address ?? null,
        description: parsed.data.description ?? null,
        timezone: parsed.data.timezone ?? "America/Sao_Paulo",
        updated_at: new Date().toISOString(),
      })
      .eq("id", member.academy_id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/academy");
    return { success: "Academia atualizada com sucesso." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para editar a academia." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar a academia.",
    };
  }
}

export async function listUnits(): Promise<AcademyUnit[]> {
  const member = await getActiveMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("academy_units")
    .select("id, academy_id, name, address, city, state, phone, is_active, timezone")
    .eq("academy_id", member.academy_id)
    .order("name");

  if (error) {
    throw error;
  }

  return (data ?? []) as AcademyUnit[];
}

export async function createUnit(
  _prevState: AcademyActionState,
  formData: FormData,
): Promise<AcademyActionState> {
  try {
    const member = await assertOwnerOrAdmin();

    const parsed = createUnitSchema.safeParse({
      name: formData.get("name"),
      address: formOptional(formData, "address"),
      city: formOptional(formData, "city"),
      state: formOptional(formData, "state"),
      phone: formOptional(formData, "phone"),
      timezone: formOptional(formData, "timezone"),
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("academy_units").insert({
      academy_id: member.academy_id,
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      state: parsed.data.state ?? null,
      phone: parsed.data.phone ?? null,
      timezone: parsed.data.timezone ?? null,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/academy");
    return { success: "Unidade criada com sucesso." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para criar unidades." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível criar a unidade.",
    };
  }
}

export async function updateUnit(
  _prevState: AcademyActionState,
  formData: FormData,
): Promise<AcademyActionState> {
  try {
    const member = await assertOwnerOrAdmin();

    const parsed = updateUnitSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      address: formOptional(formData, "address"),
      city: formOptional(formData, "city"),
      state: formOptional(formData, "state"),
      phone: formOptional(formData, "phone"),
      timezone: formOptional(formData, "timezone"),
      is_active: formData.get("is_active") ?? undefined,
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const payload: Record<string, unknown> = {
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      state: parsed.data.state ?? null,
      phone: parsed.data.phone ?? null,
      timezone: parsed.data.timezone ?? null,
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.is_active !== undefined) {
      payload.is_active = parsed.data.is_active;
    }

    const { error } = await supabase
      .from("academy_units")
      .update(payload)
      .eq("id", parsed.data.id)
      .eq("academy_id", member.academy_id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/academy");
    return { success: "Unidade atualizada com sucesso." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para editar unidades." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar a unidade.",
    };
  }
}
