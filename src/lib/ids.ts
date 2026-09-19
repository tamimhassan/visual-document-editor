export function createId(prefix: string): string {
  const globalCrypto =
    typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return `${prefix}_${globalCrypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
