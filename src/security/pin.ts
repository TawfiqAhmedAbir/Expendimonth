function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function makeSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toHex(bytes.buffer)
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

export async function verifyPin(pin: string, salt: string, expectedHash: string): Promise<boolean> {
  return (await hashPin(pin, salt)) === expectedHash
}

const UNLOCK_KEY = 'expendimonth-unlocked-at'
const LOCK_AFTER_MS = 60_000

export function markUnlocked(): void {
  sessionStorage.setItem(UNLOCK_KEY, String(Date.now()))
}

export function markLocked(): void {
  sessionStorage.removeItem(UNLOCK_KEY)
}

export function isUnlocked(): boolean {
  const raw = sessionStorage.getItem(UNLOCK_KEY)
  return Boolean(raw)
}

/** Call when the app goes to background; locks if hidden for longer than the grace window. */
export function installAutoLock(onLock: () => void): () => void {
  let hiddenAt: number | null = null
  const handler = () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now()
    else if (hiddenAt && Date.now() - hiddenAt > LOCK_AFTER_MS) {
      markLocked()
      onLock()
      hiddenAt = null
    }
  }
  document.addEventListener('visibilitychange', handler)
  return () => document.removeEventListener('visibilitychange', handler)
}
