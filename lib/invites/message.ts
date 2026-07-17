export function buildAcademyInviteMessage(input: {
  academyName: string;
  inviteUrl: string;
  inviteeName?: string | null;
}): string {
  const hello = input.inviteeName?.trim()
    ? `Olá, ${input.inviteeName.trim()}!`
    : "Olá!";

  return `${hello} Você foi convidado para entrar na academia "${input.academyName}" no app BJJ Pulse.\n\nAcesse o link para criar sua conta e entrar:\n${input.inviteUrl}`;
}

export function buildInviteMailto(input: {
  email: string;
  academyName: string;
  inviteUrl: string;
  inviteeName?: string | null;
}): string {
  const subject = encodeURIComponent(
    `Convite BJJ Pulse — ${input.academyName}`,
  );
  const body = encodeURIComponent(
    buildAcademyInviteMessage({
      academyName: input.academyName,
      inviteUrl: input.inviteUrl,
      inviteeName: input.inviteeName,
    }),
  );
  return `mailto:${encodeURIComponent(input.email)}?subject=${subject}&body=${body}`;
}
