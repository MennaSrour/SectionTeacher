import { useRef, useState, type FormEvent } from 'react'
import { Download, LockKeyhole, Moon, Upload } from 'lucide-react'
import type { Course } from '../types'
import { downloadBackup, readBackup } from '../services/backup'
import { normalizePin } from '../services/preferences'
import { PinField, usePreferences } from './AppPreferences'
import { Modal } from './Modal'
import { number } from './Views'

export function Settings({ ready, canRestore, read, restore }: {
  ready: boolean
  canRestore: boolean
  read: () => Promise<Course[] | null>
  restore: (courses: Course[]) => Promise<string | undefined>
}) {
  const { dark, pinEnabled, toggleTheme, lock, storageError } = usePreferences()
  const [pinMode, setPinMode] = useState<'change' | 'remove'>()
  const [backup, setBackup] = useState<Course[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error?: boolean }>()
  const fileField = useRef<HTMLInputElement>(null)

  async function selectBackup(file: File) {
    setBusy(true)
    setMessage(undefined)
    try {
      setBackup(await readBackup(file))
    } catch (failure) {
      setMessage({ text: failure instanceof Error ? failure.message : 'تعذّرت قراءة النسخة الاحتياطية.', error: true })
    } finally {
      setBusy(false)
    }
  }

  async function exportBackup() {
    setBusy(true)
    setMessage(undefined)
    try {
      const courses = await read()
      if (!courses) throw new Error()
      downloadBackup(courses)
    } catch {
      setMessage({ text: 'تعذّر تصدير النسخة الاحتياطية.', error: true })
    } finally {
      setBusy(false)
    }
  }

  async function confirmRestore() {
    if (!backup) return
    setBusy(true)
    const failure = await restore(backup)
    setBusy(false)
    setBackup(null)
    setMessage(failure ? { text: failure, error: true } : { text: 'تمت استعادة النسخة الاحتياطية.' })
  }

  return <section aria-labelledby="settings-title">
    <div className="section-heading detail"><h1 id="settings-title">الإعدادات</h1></div>
    <div className="settings-list">
      <section className="settings-card">
        <div className="settings-title"><span className="tile-icon tone-0"><LockKeyhole size={21} /></span><h2>قفل التطبيق</h2></div>
        <p>اطلب رمزًا من ٤ أرقام عند فتح التطبيق في هذا المتصفح.</p>
        <div className="actions">
          <button className="button primary" disabled={storageError} onClick={() => setPinMode('change')}>{pinEnabled ? 'تغيير رمز القفل' : 'تفعيل القفل'}</button>
          {pinEnabled && <>
            <button className="button secondary" onClick={lock}>قفل الآن</button>
            <button className="button secondary" onClick={() => setPinMode('remove')}>إيقاف القفل</button>
          </>}
        </div>
      </section>
      <section className="settings-card">
        <div className="settings-title"><span className="tile-icon tone-1"><Download size={21} /></span><h2>النسخ الاحتياطي</h2></div>
        <p>احفظ بيانات مساحة العمل الحالية أو استعدها من ملف JSON.</p>
        <div className="actions">
          <button className="button primary" disabled={!ready || busy} onClick={() => void exportBackup()}><Download size={18} /> تصدير نسخة احتياطية (JSON)</button>
          <button className="button secondary" disabled={!canRestore || busy} onClick={() => fileField.current?.click()}><Upload size={18} /> استعادة نسخة احتياطية</button>
        </div>
        <input ref={fileField} type="file" accept=".json,application/json" aria-label="ملف النسخة الاحتياطية" hidden
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (file) void selectBackup(file)
          }} />
        {message && <p className={`notice ${message.error ? 'form-error' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
      </section>
      <section className="settings-card">
        <div className="settings-title"><span className="tile-icon tone-2"><Moon size={21} /></span><h2>المظهر</h2></div>
        <button className="theme-toggle" role="switch" aria-checked={dark} disabled={storageError} onClick={toggleTheme}>
          الوضع الداكن <span className="theme-track" aria-hidden="true"><span /></span>
        </button>
      </section>
    </div>
    {storageError && <p className="notice form-error" role="alert">تعذّر حفظ إعدادات القفل والمظهر في هذا المتصفح.</p>}
    {pinMode && <PinEditor removing={pinMode === 'remove'} close={() => setPinMode(undefined)} />}
    {backup && <Modal title="تأكيد استعادة النسخة" onClose={() => { if (!busy) setBackup(null) }}>
      <div className="editor-form">
        <p>سيتم استبدال بيانات مساحة العمل الحالية بمحتويات النسخة التي تضم {number.format(backup.length)} من المقررات.</p>
        <div className="actions modal-actions">
          <button className="button danger" disabled={busy} onClick={() => void confirmRestore()}>تأكيد الاستعادة</button>
          <button className="button secondary" disabled={busy} onClick={() => setBackup(null)}>إلغاء</button>
        </div>
      </div>
    </Modal>}
  </section>
}

function PinEditor({ removing, close }: { removing: boolean; close: () => void }) {
  const { pinEnabled, updatePin } = usePreferences()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const title = removing ? 'إيقاف القفل' : pinEnabled ? 'تغيير رمز القفل' : 'تفعيل القفل'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const value = (name: string) => normalizePin(String(fields.get(name) ?? ''))
    const next = removing ? null : value('next')
    if (next !== null && next !== value('confirm')) { setError('الرمزان غير متطابقين.'); return }
    setBusy(true)
    const failure = await updatePin(value('current'), next)
    setBusy(false)
    if (failure) setError(failure)
    else close()
  }

  return <Modal title={title} onClose={() => { if (!busy) close() }}>
    <form className="editor-form" onSubmit={submit}>
      {pinEnabled && <PinField name="current" label="الرمز الحالي" autoFocus />}
      {!removing && <>
        <PinField name="next" label="الرمز الجديد" autoFocus={!pinEnabled} />
        <PinField name="confirm" label="تأكيد الرمز الجديد" />
      </>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="actions modal-actions">
        <button className={`button ${removing ? 'danger' : 'primary'}`} disabled={busy}>{removing ? 'إيقاف القفل' : 'حفظ الرمز'}</button>
        <button className="button secondary" type="button" disabled={busy} onClick={close}>إلغاء</button>
      </div>
    </form>
  </Modal>
}
