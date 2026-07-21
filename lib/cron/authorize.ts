/** Shared Bearer auth for cron API routes. */
export function authorizeCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const header = request.headers.get("authorization")?.trim();
  return header === `Bearer ${secret}`;
}
