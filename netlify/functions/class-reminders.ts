/**
 * Netlify Scheduled Function — calls the Next.js cron route.
 * Requires env: SITE_URL (or URL), CRON_SECRET
 */
export default async () => {
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

  const response = await fetch(`${siteUrl}/api/cron/class-reminders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });

  const text = await response.text();
  console.log("class-reminders", response.status, text);
};

export const config = {
  schedule: "*/10 * * * *",
};
