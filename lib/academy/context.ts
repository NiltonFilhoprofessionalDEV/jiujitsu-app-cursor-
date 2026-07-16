import { cookies } from "next/headers";

export const ACADEMY_COOKIE = "bjj_active_academy";

export async function getActiveAcademyId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACADEMY_COOKIE)?.value ?? null;
}

export async function setActiveAcademyId(academyId: string) {
  const store = await cookies();
  store.set(ACADEMY_COOKIE, academyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}
