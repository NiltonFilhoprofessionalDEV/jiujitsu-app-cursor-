import { buildAcademyInviteMessage } from "@/lib/invites/message";

export type SendInviteEmailResult =
  | { ok: true; mode: "resend" }
  | { ok: false; mode: "skipped"; reason: string };

/**
 * Sends invite email via Resend when RESEND_API_KEY + RESEND_FROM_EMAIL are set.
 * Otherwise returns skipped so the UI can fall back to mailto.
 */
export async function sendInviteEmail(input: {
  to: string;
  academyName: string;
  inviteUrl: string;
  inviteeName?: string | null;
}): Promise<SendInviteEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    return {
      ok: false,
      mode: "skipped",
      reason: "RESEND_API_KEY / RESEND_FROM_EMAIL não configurados",
    };
  }

  const text = buildAcademyInviteMessage({
    academyName: input.academyName,
    inviteUrl: input.inviteUrl,
    inviteeName: input.inviteeName,
  });

  const html = `
    <p>${input.inviteeName ? `Olá, <strong>${escapeHtml(input.inviteeName)}</strong>!` : "Olá!"}</p>
    <p>Você foi convidado para entrar na academia <strong>${escapeHtml(input.academyName)}</strong> no app BJJ Pulse.</p>
    <p><a href="${escapeHtml(input.inviteUrl)}">Criar conta e entrar</a></p>
    <p style="color:#666;font-size:12px">Se o botão não funcionar, copie: ${escapeHtml(input.inviteUrl)}</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Convite BJJ Pulse — ${input.academyName}`,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Falha ao enviar e-mail (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  return { ok: true, mode: "resend" };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
