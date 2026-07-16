/**
 * Build display name from registration name parts.
 */
export function formatFullName(parts: {
  firstName: string;
  middleName?: string;
  lastName: string;
}): string {
  return [parts.firstName, parts.middleName?.trim(), parts.lastName]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize phone to digits and leading + for storage.
 */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}
