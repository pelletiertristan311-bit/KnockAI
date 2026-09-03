// Shared password strength rule, enforced server-side on every route that
// sets a password (register, reset, change-password) — client-side checks
// alone can always be bypassed by calling the API directly.
export function validatePassword(pw: string): string | null {
  if (!pw || pw.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Le mot de passe doit contenir au moins une lettre et un chiffre';
  return null;
}
