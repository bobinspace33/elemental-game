/** Regional-indicator flag emoji from ISO 3166-1 alpha-2, or a neutral placeholder. */
export function countryCodeToFlagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "🌐";
  const u = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(u)) return "🌐";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + u.charCodeAt(0) - 65, A + u.charCodeAt(1) - 65);
}
