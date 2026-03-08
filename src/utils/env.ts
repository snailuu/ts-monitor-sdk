export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

export function isNode(): boolean {
  return typeof process !== 'undefined' && !!process.versions?.node
}

export function getTimestamp(): number {
  return Date.now()
}
