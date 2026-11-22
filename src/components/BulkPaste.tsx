import { useState, type FormEvent } from 'react'
import type { StudentDetails } from '../types'
import { Modal } from './Modal'

export function BulkPaste({ close, save }: {
  close: () => void
  save: (rows: StudentDetails[]) => Promise<string | undefined>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = String(new FormData(event.currentTarget).get('students') ?? '')
    const lines = input.split(/\r\n?|\n/).map((line) => line.trim()).filter(Boolean)
    if (!lines.length || lines.length > 10_000) {
      setError('ألصق من طالب واحد إلى ١٠٬٠٠٠ طالب في كل مرة.')
      return
    }
    const rows = lines.map((line) => {
      const comma = line.search(/[,،]/)
      return comma < 0 ? { name: line, code: '' } : {
        code: line.slice(0, comma).trim(), name: line.slice(comma + 1).trim(),
      }
    })
    setBusy(true)
    setError(await save(rows))
    setBusy(false)
  }

  return <Modal title="لصق سريع" onClose={() => { if (!busy) close() }}>
    <form className="editor-form" onSubmit={submit}>
      <p>ألصق طالبًا في كل سطر بصيغة «الكود، الاسم» أو اكتب الاسم وحده.</p>
      <label>قائمة الطلاب
        <textarea name="students" rows={6} maxLength={2_000_000} placeholder={'001، أحمد سعيد\nمريم علي'} required autoFocus />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="actions modal-actions">
        <button className="button primary" disabled={busy}>إضافة الطلاب</button>
        <button className="button secondary" type="button" disabled={busy} onClick={close}>إلغاء</button>
      </div>
    </form>
  </Modal>
}
