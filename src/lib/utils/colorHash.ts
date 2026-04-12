const AVATAR_PALETTE = [
  "oklch(58% 0.18 272)",
  "oklch(64% 0.14 216)",
  "oklch(70% 0.16 162)",
  "oklch(72% 0.17 94)",
  "oklch(62% 0.2 24)",
  "oklch(66% 0.16 320)",
] as const;

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function colorHash(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase() ?? "churnpulse";
  return AVATAR_PALETTE[hashString(normalized) % AVATAR_PALETTE.length];
}

export function initialsFromValue(value: string | null | undefined): string {
  const normalized = value?.trim();

  if (!normalized) {
    return "CP";
  }

  const parts = normalized
    .replace(/[@._-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "CP";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}
