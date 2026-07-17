import webpush from "web-push";

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:admin@bjjpulse.app";

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys não configuradas (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).",
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function sendWebPush(input: {
  subscription: PushSubscriptionPayload;
  title: string;
  body: string;
  url?: string;
}): Promise<{ ok: true } | { ok: false; statusCode?: number; gone: boolean }> {
  configureWebPush();

  try {
    await webpush.sendNotification(
      {
        endpoint: input.subscription.endpoint,
        keys: input.subscription.keys,
      },
      JSON.stringify({
        title: input.title,
        body: input.body,
        url: input.url ?? "/checkin",
      }),
      {
        TTL: 60 * 60,
        urgency: "high",
      },
    );
    return { ok: true };
  } catch (err) {
    const statusCode =
      err && typeof err === "object" && "statusCode" in err
        ? Number((err as { statusCode: number }).statusCode)
        : undefined;
    return {
      ok: false,
      statusCode,
      gone: statusCode === 404 || statusCode === 410,
    };
  }
}
