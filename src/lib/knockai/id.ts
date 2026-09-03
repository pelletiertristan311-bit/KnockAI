// Unpredictable ID generation. Uses the Web Crypto API (available in both the
// browser and the Vercel/Node runtime) instead of Date.now()-only or
// Math.random()-only IDs, which are guessable/brute-forceable.

function randomBytesHex(length: number): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// `prefix-<timestamp>-<random>` — timestamp keeps IDs roughly sortable and
// unique even without randomness; the random suffix makes them unguessable.
export function randomId(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomBytesHex(8)}`;
}

// Team invite codes are bearer secrets (whoever has one can join the team),
// so they get real cryptographic randomness. Alphabet excludes ambiguous
// characters (0/O, 1/I/L) to keep codes easy to read and type.
const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomInviteCode(length = 8): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join('');
}
