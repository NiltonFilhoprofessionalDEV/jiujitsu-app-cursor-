/**
 * Netlify Scheduled Function — triggers Next.js auto-sessions cron.
 * Requires env: SITE_URL (or URL / DEPLOY_PRIME_URL), CRON_SECRET
 *
 * Vercel Hobby only runs native cron once/day, so Netlify (or GitHub Actions)
 * must hit this route every few minutes for class auto-open to work.
 */
async function triggerAutoSessions() {
  const siteUrl = (
    process.env.SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    ""
  ).replace(/\/$/, "");
  const secret = process.env.CRON_SECRET?.trim();

  if (!siteUrl || !secret) {
    console.error("Missing SITE_URL/URL or CRON_SECRET");
    return;
  }

  const response = await fetch(`${siteUrl}/api/cron/auto-sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });

  const text = await response.text();
  console.log("auto-sessions", response.status, text);
}

export default triggerAutoSessions;

export const config = {
  schedule: "*/2 * * * *",
};
