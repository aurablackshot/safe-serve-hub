export const PRODUCTS = [
  "Adjustable Antiwing",
  "Normal Adjustable",
  "Aim Assist",
  "Aimlock",
  "Sniper",
  "Quickscope",
  "Private Sniper",
] as const;

export type Product = (typeof PRODUCTS)[number];

export const DURATIONS = [
  { label: "7 Days", value: "7d", days: 7 },
  { label: "30 Days", value: "30d", days: 30 },
  { label: "Lifetime", value: "lifetime", days: null },
] as const;

export type DurationValue = (typeof DURATIONS)[number]["value"];

export function computeExpiresAt(value: DurationValue): string | null {
  const d = DURATIONS.find((x) => x.value === value);
  if (!d || d.days === null) return null;
  const date = new Date();
  date.setDate(date.getDate() + d.days);
  return date.toISOString();
}