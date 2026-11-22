import { useEffect, useMemo, useState } from 'react'
import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { Cloud, LogIn, LogOut } from 'lucide-react'
import App from '../App'
import { createFirebaseStorage } from '../services/firebaseStorage'

let backend: ReturnType<typeof connect> | undefined

function connect(config: FirebaseOptions) {
  const app = getApps().find((item) => item.name === 'section-teacher') ?? initializeApp(config, 'section-teacher')
  return {
    auth: getAuth(app),
    db: initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }),
  }
}

export default function FirebaseApp({ config }: { config: FirebaseOptions }) {
  const connection = useMemo(() => {
    try {
      return backend ??= connect(config)
    } catch {
      return undefined
    }
  }, [config])
  const [user, setUser] = useState<User | null>()
  const [localMode, setLocalMode] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!connection) return
    return onAuthStateChanged(connection.auth, setUser, () => {
      setUser(null)
      setError('تعذّر استعادة تسجيل الدخول إلى Firebase.')
    })
  }, [connection])

  const store = useMemo(() => connection && user ? createFirebaseStorage(connection.db, user.uid) : undefined, [connection, user])

  async function authenticate(logout: boolean) {
    if (!connection) return
    setBusy(true)
    setError('')
    try {
      if (logout) await signOut(connection.auth)
      else await signInWithPopup(connection.auth, new GoogleAuthProvider())
    } catch {
      setError(logout ? 'تعذّر تسجيل الخروج.' : 'تعذّر تسجيل الدخول. تحقّق من الاتصال وإعدادات تسجيل الدخول عبر Google.')
    } finally {
      setBusy(false)
    }
  }

  if (localMode) return <App key="local" account={<div className="sync-status">
    <span>تخزين على هذا الجهاز</span>
    <button className="button secondary" onClick={() => setLocalMode(false)}><Cloud size={17} /> مساحة Firebase</button>
  </div>} />

  if (store && user) return <App key={user.uid} store={store} account={<div className="sync-status">
    <span><Cloud size={17} /> مساحة Firebase{user.email && <> · <bdi>{user.email}</bdi></>}</span>
    <div className="actions">
      <button className="button secondary" onClick={() => setLocalMode(true)}>التخزين المحلي</button>
      <button className="button secondary" onClick={() => void authenticate(true)} disabled={busy}><LogOut size={17} /> تسجيل الخروج</button>
    </div>
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>} />

  return <main className="auth-screen">
    <span className="tile-icon tone-0"><Cloud size={24} /></span>
    <h1>مساعد المعيد</h1>
    <p>{!connection ? 'تعذّر تهيئة Firebase. يمكنك متابعة العمل بالتخزين المحلي.'
      : user === undefined ? 'جارٍ استعادة تسجيل الدخول…'
      : 'سجّل الدخول عبر Google لفتح مساحة عملك على أجهزتك.'}</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="actions">
      {connection && user === null && <button className="button primary" onClick={() => void authenticate(false)} disabled={busy}>
        <LogIn size={18} /> تسجيل الدخول عبر Google
      </button>}
      <button className="button secondary" onClick={() => setLocalMode(true)}>متابعة بالتخزين المحلي</button>
    </div>
  </main>
}
