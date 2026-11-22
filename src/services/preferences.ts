export const pinKey = 'section-teacher.pin.v1'
export const themeKey = 'section-teacher.theme'
const attemptsKey = 'section-teacher.pin-attempts'

export function normalizePin(value: string) {
  return value.trim().replace(/[٠-٩۰-۹]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) % 10))
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPin(pin: string, salt: Uint8Array<ArrayBuffer>) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600_000 }, key, 256)
  return hex(new Uint8Array(hash))
}

export async function savePin(pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  localStorage.setItem(pinKey, `v1:${hex(salt)}:${await hashPin(pin, salt)}`)
}

export async function checkPin(pin: string, record: string) {
  const match = /^v1:([0-9a-f]{32}):([0-9a-f]{64})$/.exec(record)
  if (!match) throw new Error('تعذّرت قراءة إعدادات القفل.')
  const [attempts = 0, blockedUntil = 0] = (localStorage.getItem(attemptsKey) ?? '').split(':').map(Number)
  if (blockedUntil > Date.now()) throw new Error('محاولات كثيرة. انتظر ٣٠ ثانية ثم أعد المحاولة.')
  const salt = Uint8Array.from(match[1].match(/../g)!, (pair) => parseInt(pair, 16))
  const actual = await hashPin(pin, salt)
  let difference = 0
  for (let index = 0; index < actual.length; index++) difference |= actual.charCodeAt(index) ^ match[2].charCodeAt(index)
  if (difference === 0) {
    localStorage.removeItem(attemptsKey)
    return true
  }
  const count = blockedUntil ? 1 : attempts + 1
  localStorage.setItem(attemptsKey, `${count}:${count >= 5 ? Date.now() + 30_000 : 0}`)
  return false
}
