import { useId, useState, type FormEvent } from 'react'
import { ArrowRight, Check, ChevronLeft, ClipboardList, Minus, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import type { Assessment, AssessmentResult, Bonus, Section } from '../types'
import { SubmissionImport } from './SubmissionImport'
import { Modal } from './Modal'
import { number } from './Views'

export type SaveSection = (change: (section: Section) => Section) => Promise<string | undefined>
export type SaveAssessment = (change: (assessment: Assessment) => Assessment) => Promise<string | undefined>

const initialBonus: Bonus = { points: 0, note: '' }
const gradeNumber = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 8 })

export function Assessments({ section, assessmentId, path, save }: {
  section: Section
  assessmentId?: string
  path: string
  save: SaveSection
}) {
  const [editor, setEditor] = useState<'create' | 'edit' | 'delete'>()
  const [error, setError] = useState<string>()
  const assessments = section.assessments ?? []
  const assessment = assessments.find((item) => item.id === assessmentId)
  const showBonus = assessmentId === 'bonus'

  function updateAssessments(change: (items: Assessment[]) => Assessment[]) {
    return save((current) => ({ ...current, assessments: change(current.assessments ?? []) }))
  }

  function updateAssessment(change: (item: Assessment) => Assessment) {
    return updateAssessments((items) => items.map((item) => item.id === assessment?.id ? change(item) : item))
  }

  function updateResult(studentId: string, change: (result: AssessmentResult) => AssessmentResult) {
    return updateAssessment((item) => ({
      ...item,
      results: { ...item.results, [studentId]: change(item.results[studentId] ?? {}) },
    }))
  }

  async function updateBonus(studentId: string, change: (bonus: Bonus) => Bonus) {
    const failure = await save((current) => ({
      ...current,
      bonuses: { ...current.bonuses, [studentId]: change(current.bonuses?.[studentId] ?? initialBonus) },
    }))
    setError(failure)
    return failure
  }

  async function saveDetails(name: string, maxScore?: number) {
    if (editor === 'delete') {
      const failure = await updateAssessments((items) => items.filter((item) => item.id !== assessment?.id))
      if (!failure) location.hash = path
      return failure
    }
    const details = maxScore === undefined ? { name } : { name, maxScore }
    if (assessment && editor === 'edit') {
      if (maxScore !== undefined && Object.values(assessment.results).some(({ score }) => (score ?? 0) > maxScore)) {
        return 'الدرجة النهائية أقل من درجة مسجّلة. عدّل درجات الطلاب أولًا.'
      }
      return updateAssessment(({ maxScore: _oldMax, ...item }) => ({ ...item, ...details }))
    }
    const id = crypto.randomUUID()
    const route = location.hash
    const failure = await updateAssessments((items) => [...items, { id, ...details, results: {} }])
    if (!failure && location.hash === route) location.hash = `${path}/${id}`
    return failure
  }

  return <section aria-label="التاسكات والتقييمات">
    {(assessment || showBonus) && <a className="inline-back" href={`#${path}`}><ArrowRight size={17} /> التاسكات والتقييمات</a>}
    {error && <p className="notice form-error" role="alert">{error}</p>}
    {assessment ? <>
      <div className="section-heading detail">
        <div>
          <h1>{assessment.name}</h1>
          {assessment.maxScore !== undefined && <p>الدرجة النهائية · {gradeNumber.format(assessment.maxScore)}</p>}
        </div>
        <div className="actions">
          <button className="button secondary" onClick={() => setEditor('edit')}><Pencil size={17} /> تعديل التقييم</button>
          <button className="icon-button delete" aria-label="حذف التقييم" onClick={() => setEditor('delete')}><Trash2 size={18} /></button>
        </div>
      </div>
      <SubmissionImport assessment={assessment} students={section.students} save={updateAssessment} />
      {section.students.length === 0 && <p className="empty">لا يوجد طلاب في هذا السكشن.</p>}
      <ul className="grading-list">
        {section.students.map((student) => {
          const result = assessment.results[student.id]
          return <li className="grading-row" key={student.id}>
            <div className="grading-student"><strong>{student.name}</strong><small>الكود · <bdi>{student.code}</bdi></small></div>
            <div className="grading-controls">
              <button className="submission-toggle" aria-label={`تسليم ${student.name}`} aria-pressed={result?.submitted ?? false}
                onClick={async () => setError(await updateResult(student.id, (item) => ({ ...item, submitted: !item.submitted })))}>
                {result?.submitted && <Check size={17} />} {result?.submitted ? 'تم التسليم' : 'لم يسلم'}
              </button>
              <GradeInput key={result?.score ?? 'empty'} studentName={student.name} score={result?.score}
                maxScore={assessment.maxScore} save={(score) => updateResult(student.id, (item) => {
                  const { score: _oldScore, ...rest } = item
                  return score === undefined ? rest : { ...rest, score }
                })} />
            </div>
          </li>
        })}
      </ul>
    </> : showBonus ? <>
      <div className="section-heading detail"><h1>البونص</h1></div>
      {!section.students.length && <p className="empty">لا يوجد طلاب في هذا السكشن.</p>}
      <ul className="grading-list">
        {section.students.map((student) => {
          const bonus = section.bonuses?.[student.id] ?? initialBonus
          return <li className="grading-row" key={student.id}>
            <div className="grading-student"><strong>{student.name}</strong><small>الكود · <bdi>{student.code}</bdi></small></div>
            <div className="bonus-controls">
              <button className="button secondary" aria-label={`زيادة البونص لـ ${student.name}`}
                onClick={() => void updateBonus(student.id, (value) => ({ ...value, points: value.points + 1 }))}><Plus size={17} /> ١</button>
              <output aria-label={`بونص ${student.name}`}>{number.format(bonus.points)}</output>
              <button className="button secondary" aria-label={`إنقاص البونص لـ ${student.name}`}
                onClick={() => void updateBonus(student.id, (value) => ({ ...value, points: value.points - 1 }))}><Minus size={17} /> ١</button>
            </div>
            <input key={bonus.note} className="grading-input bonus-note" maxLength={120} defaultValue={bonus.note}
              aria-label={`ملاحظة البونص لـ ${student.name}`} placeholder="ملاحظة البونص (اختياري)"
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
              onBlur={async (event) => {
                const input = event.currentTarget
                const note = input.value.trim()
                if (note !== bonus.note && await updateBonus(student.id, (value) => ({ ...value, note }))) input.value = bonus.note
              }} />
          </li>
        })}
      </ul>
    </> : <>
      <div className="section-heading detail">
        <h1>التاسكات والتقييمات</h1>
        <div className="actions">
          <button className="button primary" onClick={() => setEditor('create')}><Plus size={19} /> إضافة تقييم</button>
          <a className="button secondary" href={`#${path}/bonus`}><Star size={18} /> البونص</a>
        </div>
      </div>
      {!assessments.length && <p className="empty">لا توجد تقييمات بعد.</p>}
      <ul className="grading-list">
        {assessments.map((item) => (
          <li className="record" key={item.id}>
            <a className="record-link" href={`#${path}/${item.id}`}>
              <span className="tile-icon tone-0"><ClipboardList size={21} /></span>
              <span><strong>{item.name}</strong>
                {item.maxScore !== undefined && <small>الدرجة النهائية · {gradeNumber.format(item.maxScore)}</small>}
              </span>
              <ChevronLeft className="record-arrow" size={18} />
            </a>
          </li>
        ))}
      </ul>
    </>}
    {editor && <AssessmentEditor mode={editor} assessment={assessment} close={() => setEditor(undefined)} save={saveDetails} />}
  </section>
}

function GradeInput({ studentName, score, maxScore, save }: {
  studentName: string
  score?: number
  maxScore?: number
  save: (score?: number) => Promise<string | undefined>
}) {
  const [error, setError] = useState<string>()
  const errorId = useId()
  return <div className="grade-field">
    <input type="number" inputMode="decimal" min="0" max={maxScore} step="any" className="grading-input"
      aria-label={`درجة ${studentName}`} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} defaultValue={score} placeholder="الدرجة"
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
      onBlur={async (event) => {
        const input = event.currentTarget
        if (!input.validity.valid) {
          setError(maxScore === undefined ? 'أدخل درجة صفرًا أو أكثر.' : `أدخل درجة بين ٠ و${gradeNumber.format(maxScore)}.`)
          return
        }
        const next = input.value === '' ? undefined : input.valueAsNumber
        setError(next === score ? undefined : await save(next))
      }} />
    {error && <small id={errorId} role="alert" className="form-error">{error}</small>}
  </div>
}

function AssessmentEditor({ mode, assessment, close, save }: {
  mode: 'create' | 'edit' | 'delete'
  assessment?: Assessment
  close: () => void
  save: (name: string, maxScore?: number) => Promise<string | undefined>
}) {
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const deleting = mode === 'delete'
  const title = deleting ? 'حذف التقييم' : mode === 'edit' ? 'تعديل التقييم' : 'إضافة تقييم'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const name = String(fields.get('name') ?? '').trim()
    const max = fields.get('max')
    if (!deleting && !name) { setError('أدخل اسم التقييم.'); return }
    setSaving(true)
    const failure = await save(name, max ? Number(max) : undefined)
    setSaving(false)
    if (failure) setError(failure)
    else close()
  }

  return <Modal title={title} onClose={() => { if (!saving) close() }}>
    <form className="editor-form" onSubmit={submit}>
      {deleting ? <p>هل تريد حذف «{assessment?.name}» ودرجاته وحالات التسليم؟</p> : <>
        <label>اسم التقييم<input name="name" required maxLength={120} autoFocus defaultValue={assessment?.name} /></label>
        <label>الدرجة النهائية (اختياري)<input name="max" type="number" min="0" step="any" inputMode="decimal" defaultValue={assessment?.maxScore} /></label>
      </>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="actions modal-actions">
        <button className={`button ${deleting ? 'danger' : 'primary'}`} disabled={saving}>{deleting ? 'حذف' : 'حفظ'}</button>
        <button className="button secondary" type="button" disabled={saving} onClick={close}>إلغاء</button>
      </div>
    </form>
  </Modal>
}
