/** Digits only from a phone string. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normalize BR WhatsApp number for wa.me.
 * Accepts with/without country code; defaults to 55.
 */
export function toWhatsAppE164(phone: string): string | null {
  let digits = digitsOnly(phone);
  if (!digits) return null;

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length >= 10 && digits.length <= 11) {
    digits = `55${digits}`;
  }

  if (digits.length < 12 || digits.length > 13) {
    return null;
  }

  return digits;
}

export function whatsappChatUrl(phone: string, message: string): string | null {
  const e164 = toWhatsAppE164(phone);
  if (!e164) return null;
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}

export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
