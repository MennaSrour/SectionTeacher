import { useState, type FormEvent } from 'react'
import type { Section, Student } from '../types'
import { Modal } from './Modal'
import { number } from './Views'

const attendanceRate = new Intl.NumberFormat('ar-EG', { style: 'percent', maximumFractionDigits: 1 })
const dateLabel = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'long', timeZone: 'UTC' })
const decimal = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 8 })

export function StudentProfile({ student, section, onClose, onSave }: {
  student: Student
  section: Section
  onClose: () => void
  onSave: (note: string) => Promise<string | undefined>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const entries = (section.sessions ?? []).flatMap((session) => {
    const entry = session.entries.find((item) => item.student.id === student.id)
    return entry ? [{ session, status: entry.status }] : []
  })
  const absent = entries.filter((entry) => entry.status === 'absent')
    .sort((a, b) => b.session.date.localeCompare(a.session.date))
  const marked = entries.filter((entry) => entry.status !== undefined).length
  const present = entries.filter((entry) => entry.status === 'present').length
  const assessments = section.assessments ?? []
  const bonus = section.bonuses?.[student.id]?.points ?? 0

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const note = String(new FormData(event.currentTarget).get('note') ?? '').trim()
    setBusy(true)
    setError(undefined)
    const failure = await onSave(note)
    setBusy(false)
    if (failure) setError(failure)
    else onClose()
  }

  return <Modal title={student.name} sheet onClose={() => { if (!busy) onClose() }}>
    <p className="profile-code">الكود الجامعي · <bdi>{student.code || '—'}</bdi></p>
    <dl className="profile-stats">
      <div><dt>نسبة الحضور</dt><dd>{marked ? attendanceRate.format(present / marked) : '—'}</dd>
        <small>{marked ? `${number.format(present)} من ${number.format(marked)} جلسات مسجّلة` : 'لا يوجد حضور مسجّل'}</small>
      </div>
      <div><dt>البونص</dt><dd>{number.format(bonus)}</dd></div>
    </dl>
    <section className="profile-block">
      <h3>تواريخ الغياب</h3>
      {absent.length ? <ul>{absent.map(({ session }) => <li key={session.id}>
        <time dateTime={session.date}>{dateLabel.format(new Date(`${session.date}T00:00:00Z`))}</time>
        {session.label && <small>{session.label}</small>}
      </li>)}</ul> : <p>لا توجد حالات غياب مسجّلة.</p>}
    </section>
    <section className="profile-block">
      <h3>التاسكات والتقييمات</h3>
      {assessments.length ? <ul>{assessments.map((assessment) => {
        const result = assessment.results[student.id]
        const score = result?.score === undefined ? '—' : decimal.format(result.score)
        return <li key={assessment.id}>
          <div>{assessment.name}<small>{result?.submitted ? 'تم التسليم' : 'لم يسلم'}</small></div>
          <bdi>{score}{assessment.maxScore !== undefined && ` / ${decimal.format(assessment.maxScore)}`}</bdi>
        </li>
      })}</ul> : <p>لا توجد تقييمات في هذا السكشن.</p>}
    </section>
    <form className="editor-form" onSubmit={submit}>
      <label>ملاحظات المعيد
        <textarea name="note" rows={3} maxLength={1500} defaultValue={section.studentNotes?.[student.id] ?? ''} />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary" disabled={busy}>حفظ الملاحظات</button>
    </form>
  </Modal>
}
