import { cookies } from "next/headers";

export const ACADEMY_COOKIE = "bjj_active_academy";

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getActiveAcademyId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACADEMY_COOKIE)?.value ?? null;
}

export async function setActiveAcademyId(academyId: string) {
  if (!UUID_V4_RE.test(academyId)) {
    throw new Error("Invalid academy ID: expected UUID v4");
  }

  const store = await cookies();
  store.set(ACADEMY_COOKIE, academyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearActiveAcademyId() {
  const store = await cookies();
  store.delete(ACADEMY_COOKIE);
}
