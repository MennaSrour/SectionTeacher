import { useState, type FormEvent } from 'react'
import type { StudentDetails } from '../types'
import { mapStudents, type Sheet } from '../services/spreadsheet'
import { Modal } from './Modal'

export type EditorState =
  | { type: 'course' | 'section' | 'student'; title: string; id?: string; name?: string; code?: string }
  | { type: 'delete-section' | 'delete-student'; id: string; name: string }
  | { type: 'import'; sheet: Sheet }

export function Editor({ editor, onClose, onSave, onImport }: {
  editor: EditorState
  onClose: () => void
  onSave: (details: StudentDetails) => Promise<string | undefined>
  onImport: (students: StudentDetails[]) => Promise<string | undefined>
}) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [nameColumn, setNameColumn] = useState(editor.type === 'import' ? editor.sheet.nameColumn : -1)
  const [codeColumn, setCodeColumn] = useState(editor.type === 'import' ? editor.sheet.codeColumn : -1)
  const codeRequired = editor.type === 'student' && (!editor.id || !!editor.code)
  const deleting = editor.type === 'delete-section' || editor.type === 'delete-student'
  const title = editor.type === 'import' ? 'تحديد أعمدة الطلاب' : 'title' in editor ? editor.title : 'تأكيد الحذف'
  const close = () => { if (!saving) onClose() }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const name = String(fields.get('name') ?? '').trim()
    const code = String(fields.get('code') ?? '').trim()
    setError('')
    if (editor.type === 'import') {
      if (nameColumn < 0 || codeColumn < 0 || nameColumn === codeColumn) {
        setError('اختر عمودًا مختلفًا لكل حقل.')
        return
      }
    } else if (!deleting && (!name || (codeRequired && !code))) {
      setError('املأ الحقول المطلوبة.')
      return
    }
    setSaving(true)
    const failure = editor.type === 'import'
      ? await onImport(mapStudents(editor.sheet, nameColumn, codeColumn))
      : await onSave({ name, code })
    if (failure) setError(failure)
    else onClose()
    setSaving(false)
  }

  return <Modal title={title} onClose={close}>
    <form className="editor-form" onSubmit={submit}>
      {editor.type === 'import' ? <>
        <p>اختر عمود الاسم وعمود الكود من الصف الأول في الملف.</p>
        <ColumnSelect label="عمود الاسم" headers={editor.sheet.headers} value={nameColumn} onChange={setNameColumn} />
        <ColumnSelect label="عمود الكود" headers={editor.sheet.headers} value={codeColumn} onChange={setCodeColumn} />
      </> : deleting ? (
        <p>هل تريد حذف «{editor.name}»؟ {editor.type === 'delete-section' && 'سيتم حذف قائمة الطلاب وسجل الحضور لهذا السكشن.'}</p>
      ) : <>
        <label>
          {editor.type === 'course' ? 'اسم المقرر' : editor.type === 'section' ? 'اسم السكشن' : 'اسم الطالب'}
          <input name="name" defaultValue={editor.name} required autoFocus maxLength={200} />
        </label>
        {editor.type === 'student' && <label>
          الكود الجامعي
          <input name="code" defaultValue={editor.code} required={codeRequired} dir="auto" maxLength={100} />
        </label>}
      </>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="actions modal-actions">
        <button className={`button ${deleting ? 'danger' : 'primary'}`} disabled={saving}>
          {deleting ? 'حذف' : editor.type === 'import' ? 'استيراد الطلاب' : 'حفظ'}
        </button>
        <button className="button secondary" type="button" disabled={saving} onClick={close}>إلغاء</button>
      </div>
    </form>
  </Modal>
}

function ColumnSelect({ label, headers, value, onChange }: {
  label: string; headers: string[]; value: number; onChange: (value: number) => void
}) {
  return <label>
    {label}
    <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
      <option value={-1}>اختر العمود</option>
      {Array.from(headers, (header, index) => (
        <option key={index} value={index}>{header || `العمود ${(index + 1).toLocaleString('ar-EG')}`}</option>
      ))}
    </select>
  </label>
}
