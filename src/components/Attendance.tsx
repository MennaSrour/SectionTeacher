import { useState, type FormEvent } from 'react'
import { CalendarDays, Check, ChevronLeft, Clock3, Pencil, Plus, Search, UserCheck, UserX, X } from 'lucide-react'
import type { AttendanceEntry, AttendanceSession, AttendanceStatus, Section, Student } from '../types'
import { Modal } from './Modal'
import { number } from './Views'

type SessionDetails = Pick<AttendanceSession, 'date' | 'label'>
type SaveSession = (change: (sessions: AttendanceSession[]) => AttendanceSession[]) => Promise<string | undefined>

const statuses = [
  { status: 'present', label: 'حاضر', icon: Check },
  { status: 'absent', label: 'غائب', icon: X },
  { status: 'excused', label: 'متأخر/بعذر', icon: Clock3 },
] as const

const dateFormat = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'long', timeZone: 'UTC' })
const formatDate = (date: string) => dateFormat.format(new Date(`${date}T00:00:00Z`))

function today() {
  const now = new Date()
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, '0')).join('-')
}

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, ' ')
    .replace(/[أإآٱ]/g, 'ا').replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[٠-٩۰-۹]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) % 10))
}

export function Attendance({ section, session, path, save, onProfile }: {
  section: Section
  onProfile: (student: Student) => void
  session?: AttendanceSession
  path: string
  save: SaveSession
}) {
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string>()
  const sessions = section.sessions ?? []

  async function saveDetails(details: SessionDetails) {
    if (session) {
      return save((all) => all.map((item) => item.id === session.id ? { ...item, ...details } : item))
    }
    const next: AttendanceSession = {
      ...details,
      id: crypto.randomUUID(),
      entries: section.students.map((student) => ({ student })),
    }
    const route = location.hash
    const failure = await save((all) => [next, ...all])
    if (!failure && location.hash === route) location.hash = `${path}/${next.id}`
    return failure
  }

  async function markEntries(change: (entry: AttendanceEntry) => AttendanceEntry) {
    if (!session) return
    const failure = await save((all) => all.map((item) =>
      item.id === session.id ? { ...item, entries: item.entries.map(change) } : item,
    ))
    setError(failure)
  }

  function markStudent(studentId: string, status: AttendanceStatus) {
    void markEntries((entry) => entry.student.id === studentId
      ? { ...entry, status: entry.status === status ? undefined : status }
      : entry)
  }

  const filter = normalize(query)
  const entries = session?.entries ?? []
  const visible = entries.filter(({ student }) =>
    normalize(student.name).includes(filter) || normalize(student.code).endsWith(filter),
  )
  const present = entries.filter((entry) => entry.status === 'present').length
  const remaining = entries.filter((entry) => entry.status === undefined).length

  return <section aria-label="الحضور">
    {session ? <>
      <a href={`#${path}`} className="attendance-back"><ChevronLeft size={17} /> سجل الجلسات</a>
      <div className="section-heading attendance-heading">
        <div><h1>{session.label || 'تسجيل الحضور'}</h1><p><time dateTime={session.date}>{formatDate(session.date)}</time></p></div>
        <button className="button secondary" onClick={() => setEditing(true)}><Pencil size={17} /> تعديل الجلسة</button>
      </div>
      <div className="attendance-tools">
        <div className="attendance-search">
          <Search size={20} aria-hidden="true" />
          <input type="search" aria-label="ابحث بالاسم أو آخر أرقام الكود"
            placeholder="ابحث بالاسم أو آخر أرقام الكود" value={query} onChange={(event) => setQuery(event.target.value)} />
          {query && <button className="icon-button" aria-label="مسح البحث" onClick={() => setQuery('')}><X size={18} /></button>}
        </div>
        <div className="attendance-controls">
          <div className="attendance-totals" role="status">
            <strong>الحضور <bdi>{number.format(present)} / {number.format(entries.length)}</bdi></strong>
            <small>لم يُسجّل · {number.format(remaining)}</small>
          </div>
          <div className="attendance-actions">
            <button className="button secondary" disabled={present === entries.length}
              onClick={() => void markEntries((entry) => ({ ...entry, status: 'present' }))}>
              <UserCheck size={17} /> تحضير الكل
            </button>
            <button className="button secondary" disabled={!remaining}
              onClick={() => void markEntries((entry) => entry.status ? entry : { ...entry, status: 'absent' })}>
              <UserX size={17} /> تغيب الباقي
            </button>
          </div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      {visible.length === 0 && <p className="empty">{filter ? 'لا يوجد طلاب مطابقون للبحث.' : 'لا يوجد طلاب في هذه الجلسة.'}</p>}
      <ul className="m-0 grid list-none gap-2 p-0">
        {visible.map(({ student, status }) => (
          <li key={student.id} className="attendance-row">
            <div className="attendance-person"><button className="student-name" onClick={() => onProfile(student)}>{student.name}</button><small>الكود · <bdi>{student.code || '—'}</bdi></small></div>
            <div className="attendance-statuses" role="group" aria-label={`حضور ${student.name} · ${student.code}`}>
              {statuses.map(({ status: option, label, icon: Icon }) => (
                <button key={option} className={`attendance-status ${option}`} aria-pressed={status === option}
                  onClick={() => markStudent(student.id, option)}>
                  <Icon size={16} aria-hidden="true" /> {label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </> : <>
      <div className="section-heading attendance-heading">
        <div><h1>سجل الجلسات</h1><p>{number.format(sessions.length)} جلسة</p></div>
        <button className="button primary" onClick={() => setEditing(true)} disabled={!section.students.length}>
          <Plus size={19} /> بدء سكشن جديد
        </button>
      </div>
      {sessions.length === 0 && <p className="empty">لا توجد جلسات حضور بعد.</p>}
      {section.students.length === 0 && <p className="mt-3 text-sm">أضف طالبًا من قائمة الطلاب لبدء جلسة جديدة.</p>}
      <ul className="m-0 grid list-none gap-2 p-0">
        {[...sessions].sort((a, b) => b.date.localeCompare(a.date)).map((item) => (
          <li className="record" key={item.id}>
            <a href={`#${path}/${item.id}`} className="record-link">
              <span className="tile-icon tone-0"><CalendarDays size={20} /></span>
              <span>
                <strong>{item.label || formatDate(item.date)}</strong>
                <small>{item.label && <><time dateTime={item.date}>{formatDate(item.date)}</time> · </>}
                  {number.format(item.entries.filter((entry) => entry.status === 'present').length)} حاضر من {number.format(item.entries.length)}
                </small>
              </span>
              <ChevronLeft size={18} className="record-arrow" />
            </a>
          </li>
        ))}
      </ul>
    </>}
    {editing && <SessionEditor session={session} close={() => setEditing(false)} save={saveDetails} />}
  </section>
}

function SessionEditor({ session, close, save }: {
  session?: AttendanceSession
  close: () => void
  save: (details: SessionDetails) => Promise<string | undefined>
}) {
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setSaving(true)
    const failure = await save({
      date: String(fields.get('date')),
      label: String(fields.get('label')).trim(),
    })
    setSaving(false)
    if (failure) setError(failure)
    else close()
  }

  return <Modal title={session ? 'تعديل الجلسة' : 'بدء سكشن جديد'} onClose={() => { if (!saving) close() }}>
    <form className="editor-form" onSubmit={submit}>
      <label>تاريخ الجلسة<input name="date" type="date" defaultValue={session?.date ?? today()} min="0001-01-01" max="9999-12-31" required /></label>
      <label>عنوان الجلسة (اختياري)<input name="label" defaultValue={session?.label} placeholder="الأسبوع الثالث" maxLength={120} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="actions modal-actions">
        <button className="button primary" disabled={saving}>{session ? 'حفظ' : 'بدء الحضور'}</button>
        <button className="button secondary" type="button" onClick={close} disabled={saving}>إلغاء</button>
      </div>
    </form>
  </Modal>
}
