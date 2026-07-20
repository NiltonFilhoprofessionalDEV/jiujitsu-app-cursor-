import { normalizeEmail } from "@/lib/email";

/** Emails allowed to access /admin (comma-separated). */
export function getPlatformAdminEmails(): string[] {
  const raw = process.env.PLATFORM_ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getPlatformAdminEmails().includes(normalizeEmail(email));
}
