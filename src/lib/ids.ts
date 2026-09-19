/**
 * Stable-enough id generator. `crypto.randomUUID` is used when available so
 * ids survive a copy/paste of a template between browsers without collisions.
 */
export function createId(prefix: string): string {
  const globalCrypto =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return `${prefix}_${globalCrypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
