function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function colorHash(value: string): {
  base: string;
  accent: string;
  gradient: string;
} {
  const hash = hashString(value);
  const hue = hash % 360;
  const accentHue = (hue + 38) % 360;
  const lightness = clamp(52 + (hash % 10), 48, 62);

  const base = `oklch(${lightness}% 0.18 ${hue})`;
  const accent = `oklch(${clamp(lightness + 10, 60, 74)}% 0.15 ${accentHue})`;

  return {
    base,
    accent,
    gradient: `linear-gradient(135deg, ${base}, ${accent})`,
  };
}
