import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FileUp, UserRoundCheck } from 'lucide-react'
import type { Assessment, Student, UnmatchedSubmission } from '../types'
import { mapStudents, readSheet, type Sheet } from '../services/spreadsheet'
import { markSubmitted, matchSubmissions, normalizeName } from '../services/submissions'
import type { SaveAssessment } from './Assessments'
import { Modal } from './Modal'
import { number } from './Views'

export function SubmissionImport({ assessment, students, save }: {
  assessment: Assessment
  students: Student[]
  save: SaveAssessment
}) {
  const fileField = useRef<HTMLInputElement>(null)
  const active = useRef(false)
  const [sheet, setSheet] = useState<Sheet>()
  const [assigning, setAssigning] = useState<UnmatchedSubmission>()
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>()
  const unmatched = assessment.unmatched ?? []
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])

  async function importRows(data: Sheet, name: number, code: number) {
    const match = matchSubmissions(mapStudents(data, name, code), students)
    const failure = await save((current) => ({
      ...markSubmitted(current, match.matches),
      unmatched: [...(current.unmatched ?? []), ...match.unmatched],
    }))
    if (!failure) {
      setFeedback({ text: `تم تسجيل تسليم ${number.format(match.matches.size)} من الطلاب. التسليمات غير المطابقة في هذا الملف · ${number.format(match.unmatched.length)}` })
      setSheet(undefined)
    }
    return failure
  }

  async function importFile(file: File) {
    setFeedback(undefined)
    setBusy(true)
    try {
      const data = await readSheet(file, 1)
      if (!active.current) return
      if (data.nameColumn < 0 || data.codeColumn < 0) { setSheet(data); return }
      const failure = await importRows(data, data.nameColumn, data.codeColumn)
      if (failure) setFeedback({ text: failure, error: true })
    } catch (error) {
      const text = error instanceof Error && /[\u0600-\u06ff]/.test(error.message)
        ? error.message : 'تعذّرت قراءة ملف التسليمات.'
      if (active.current) setFeedback({ text, error: true })
    } finally {
      if (active.current) setBusy(false)
    }
  }

  async function assign(studentId: string) {
    const failure = await save((current) => ({
      ...markSubmitted(current, [studentId]),
      unmatched: (current.unmatched ?? []).filter((row) => row.id !== assigning?.id),
    }))
    if (!failure) {
      setAssigning(undefined)
      setFeedback({ text: 'تم ربط التسليم بالطالب.' })
    }
    return failure
  }

  return <div className="submission-import">
    <button className="button secondary" disabled={busy} onClick={() => fileField.current?.click()}>
      <FileUp size={18} /> {busy ? 'جارٍ قراءة الملف…' : 'استيراد تسليمات (Google Forms)'}
    </button>
    <input ref={fileField} type="file" accept=".xlsx,.csv" hidden onChange={(event) => {
      const file = event.currentTarget.files?.[0]
      event.currentTarget.value = ''
      if (file) void importFile(file)
    }} />
    {feedback && <p className={`notice ${feedback.error ? 'form-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    {unmatched.length > 0 && <details className="unmatched-list" open>
      <summary>تسليمات غير مطابقة · {number.format(unmatched.length)}</summary>
      <ul className="grading-list">
        {unmatched.map((row) => (
          <li className="record unmatched-row" key={row.id}>
            <span>{row.name || 'تسليم بلا اسم'} {row.code && <small> · <bdi>{row.code}</bdi></small>}
              <small className="unmatched-position">الرد {number.format(row.row)} في الملف</small>
            </span>
            <button className="button secondary" disabled={!students.length} onClick={() => setAssigning(row)}>ربط بطالب</button>
          </li>
        ))}
      </ul>
    </details>}
    {sheet && <ColumnMapping sheet={sheet} close={() => setSheet(undefined)} save={(name, code) => importRows(sheet, name, code)} />}
    {assigning && <AssignSubmission students={students} close={() => setAssigning(undefined)} save={assign} />}
  </div>
}

function ColumnMapping({ sheet, close, save }: {
  sheet: Sheet
  close: () => void
  save: (name: number, code: number) => Promise<string | undefined>
}) {
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const name = Number(fields.get('name'))
    const code = Number(fields.get('code'))
    if (name === code) {
      setError(name < 0 ? 'اختر عمود الاسم أو الكود على الأقل.' : 'اختر عمودًا مختلفًا لكل حقل.')
      return
    }
    setSaving(true)
    setError(await save(name, code))
    setSaving(false)
  }

  return <Modal title="تحديد أعمدة التسليمات" onClose={() => { if (!saving) close() }}>
    <form className="editor-form" onSubmit={submit}>
      <p>يمكن المطابقة بالكود أو الاسم إذا كان الملف يحتوي على عمود واحد منهما.</p>
      <label>عمود الاسم
        <select name="name" defaultValue={sheet.nameColumn}><ColumnOptions headers={sheet.headers} /></select>
      </label>
      <label>عمود الكود
        <select name="code" defaultValue={sheet.codeColumn}><ColumnOptions headers={sheet.headers} /></select>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary" disabled={saving}>استيراد التسليمات</button>
    </form>
  </Modal>
}

function ColumnOptions({ headers }: { headers: string[] }) {
  return <><option value={-1}>غير موجود</option>
    {Array.from(headers, (header, index) => <option value={index} key={index}>{header || `العمود ${number.format(index + 1)}`}</option>)}
  </>
}

function AssignSubmission({ students, close, save }: {
  students: Student[]
  close: () => void
  save: (id: string) => Promise<string | undefined>
}) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const filter = normalizeName(query)
  const matches = students.filter((student) => normalizeName(student.name).includes(filter) || student.code.includes(filter))

  return <Modal title="ربط التسليم بطالب" onClose={() => { if (!saving) close() }}>
    <label className="assignment-search">ابحث بالاسم أو الكود
      <input className="grading-input" type="search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} />
    </label>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!matches.length && <p className="empty">لا يوجد طلاب مطابقون.</p>}
    <ul className="grading-list assignment-list">
      {matches.map((student) => <li key={student.id}>
        <button className="record record-link" disabled={saving} onClick={async () => {
          setSaving(true)
          setError(await save(student.id))
          setSaving(false)
        }}>
          <UserRoundCheck size={20} /> <span><strong>{student.name}</strong><small><bdi>{student.code}</bdi></small></span>
        </button>
      </li>)}
    </ul>
  </Modal>
}
