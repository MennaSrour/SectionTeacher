import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { LockKeyhole } from 'lucide-react'
import { checkPin, normalizePin, pinKey, savePin, themeKey } from '../services/preferences'

type Theme = 'light' | 'dark'
interface Preferences {
  dark: boolean
  pinEnabled: boolean
  storageError: boolean
  toggleTheme: () => void
  updatePin: (current: string, next: string | null) => Promise<string | undefined>
  lock: () => void
}

const PreferenceContext = createContext<Preferences | null>(null)
export const usePreferences = () => useContext(PreferenceContext)!

function readPreferences() {
  try {
    const theme: Theme = localStorage.getItem(themeKey) === 'dark' ? 'dark' : 'light'
    return { theme, pin: localStorage.getItem(pinKey), storageError: false }
  } catch {
    return { theme: 'light' as const, pin: null, storageError: true }
  }
}

export function AppPreferences({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readPreferences)
  const [unlockedPin, setUnlockedPin] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { theme, pin, storageError } = preferences
  const locked = pin !== null && pin !== unlockedPin

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#122621' : '#16372f')
  }, [theme])

  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (event.key === pinKey || event.key === themeKey || event.key === null) {
        setPreferences(readPreferences())
        if (event.key !== themeKey) setUnlockedPin(null)
      }
    }
    window.addEventListener('storage', update)
    return () => window.removeEventListener('storage', update)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(themeKey, next)
      setPreferences((value) => ({ ...value, theme: next }))
    } catch {
      setPreferences((value) => ({ ...value, storageError: true }))
    }
  }

  async function updatePin(current: string, next: string | null) {
    try {
      if (pin !== localStorage.getItem(pinKey)) return 'تغيّر القفل في نافذة أخرى. أعد فتح التطبيق.'
      if (pin && (!/^\d{4}$/.test(current) || !await checkPin(current, pin))) return 'رمز القفل الحالي غير صحيح.'
      if (next !== null && !/^\d{4}$/.test(next)) return 'أدخل رمزًا من ٤ أرقام.'
      if (next === null) localStorage.removeItem(pinKey)
      else await savePin(next)
      const updated = readPreferences()
      setUnlockedPin(updated.pin)
      setPreferences(updated)
    } catch (failure) {
      return pinError(failure)
    }
  }

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const field = event.currentTarget.elements.namedItem('pin') as HTMLInputElement
    const input = normalizePin(field.value)
    setError('')
    if (!pin || !/^\d{4}$/.test(input)) {
      setError('أدخل رمز القفل المكوّن من ٤ أرقام.')
      return
    }
    setBusy(true)
    try {
      if (await checkPin(input, pin)) setUnlockedPin(pin)
      else {
        field.value = ''
        field.focus()
        setError('رمز القفل غير صحيح.')
      }
    } catch (failure) {
      setError(pinError(failure))
    } finally {
      setBusy(false)
    }
  }

  if (locked) return <main className="auth-screen lock-screen">
    <span className="tile-icon tone-0"><LockKeyhole size={24} /></span>
    <h1>مساعد المعيد</h1>
    <form className="editor-form" onSubmit={unlock}>
      <PinField name="pin" label="رمز القفل" autoFocus />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy}>فتح التطبيق</button>
    </form>
  </main>

  return <PreferenceContext.Provider value={{
    dark: theme === 'dark', pinEnabled: pin !== null, storageError,
    toggleTheme, updatePin, lock: () => { setError(''); setUnlockedPin(null) },
  }}>{children}</PreferenceContext.Provider>
}

function pinError(failure: unknown) {
  return failure instanceof Error && /[\u0600-\u06ff]/.test(failure.message)
    ? failure.message : 'تعذّر استخدام قفل التطبيق في هذا المتصفح.'
}

export function PinField({ name, label, autoFocus }: { name: string; label: string; autoFocus?: boolean }) {
  return <label>{label}
    <input type="password" name={name} inputMode="numeric" maxLength={4} autoComplete="off" required dir="ltr" autoFocus={autoFocus} />
  </label>
}
