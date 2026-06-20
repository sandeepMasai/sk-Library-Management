/** Capitalize the first letter of each word in a person's name. */
export function formatDisplayName(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return raw ?? '';

  return raw
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
