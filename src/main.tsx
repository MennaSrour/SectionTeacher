import { Component, lazy, StrictMode, Suspense, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { AppPreferences } from './components/AppPreferences'
import { readFirebaseConfig } from './services/firebaseConfig'
import './styles.css'

const config = readFirebaseConfig()
const FirebaseApp = lazy(() => import('./components/FirebaseApp'))

class FirebaseBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return <App account={<p className="notice form-error sync-status" role="alert">تعذّر تشغيل Firebase. التطبيق يعمل الآن بالتخزين المحلي.</p>} />
    }
    return this.props.children
  }
}

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppPreferences>{config ? <FirebaseBoundary>
      <Suspense fallback={<p className="auth-screen" role="status">جارٍ فتح مساحة العمل…</p>}>
        <FirebaseApp config={config} />
      </Suspense>
    </FirebaseBoundary> : <App />}</AppPreferences>
  </StrictMode>,
)
