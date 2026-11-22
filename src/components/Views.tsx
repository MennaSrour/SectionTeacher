import { ArrowLeft, BookOpen, Code2, Database, FileUp, FolderOpen, Layers3, Network, Pencil, Plus, Trash2, Users } from 'lucide-react'
import type { Course, Section, Student } from '../types'

const courseIcons = [Code2, Database, Network, BookOpen]
export const number = new Intl.NumberFormat('ar-EG')

export function Dashboard({ courses, onOpen, onAdd }: {
  courses: Course[]
  onOpen: (course: Course) => void
  onAdd: () => void
}) {
  const sections = courses.flatMap((course) => course.sections)
  const metrics = [
    { icon: BookOpen, label: 'المقررات', value: courses.length },
    { icon: Layers3, label: 'السكاشن', value: sections.length },
    { icon: Users, label: 'الطلاب المسجلون', value: sections.reduce((total, section) => total + section.students.length, 0) },
  ]

  return <>
    <section className="hero">
      <div className="hero-art" aria-hidden="true"><div /><div /><div /><Layers3 size={105} strokeWidth={1} /></div>
      <div className="hero-copy">
        <h1>لوحة المعيد</h1>
        <p>أدر مقرراتك وسكاشنك وقوائم الطلاب من مكان واحد.</p>
      </div>
    </section>
    <section className="stats" aria-label="ملخص المقررات والطلاب">
      {metrics.map(({ icon: Icon, label, value }, index) => (
        <div className="stat" key={label}>
          <span className={`tile-icon tone-${index}`}><Icon size={21} /></span>
          <div><strong>{number.format(value)}</strong><span>{label}</span></div>
        </div>
      ))}
    </section>
    <section aria-labelledby="courses-title">
      <div className="section-heading">
        <div><h2 id="courses-title">المقررات الدراسية</h2><p>اختر مقررًا لإدارة السكاشن والطلاب.</p></div>
        <button className="button primary" onClick={onAdd}><Plus size={19} /> إضافة مقرر</button>
      </div>
      {courses.length === 0 ? <Empty text="لا توجد مقررات بعد." /> :
        <div className="course-grid">
          {courses.map((course, index) => {
            const Icon = courseIcons[index % courseIcons.length]
            return (
              <button className="course-card" key={course.id} onClick={() => onOpen(course)}>
                <span className={`tile-icon tone-${index % 3}`}><Icon size={24} /></span>
                <strong>{course.name}</strong>
                <span className="course-meta">
                  <span><Layers3 size={15} /> السكاشن <b>{number.format(course.sections.length)}</b></span>
                  <ArrowLeft size={19} className="card-arrow" />
                </span>
              </button>
            )
          })}
        </div>}
    </section>
  </>
}

export function CourseView({ course, onAdd, onOpen, onEdit, onDelete }: {
  course: Course
  onAdd: () => void
  onOpen: (section: Section) => void
  onEdit: (section: Section) => void
  onDelete: (section: Section) => void
}) {
  return <section>
    <div className="section-heading detail">
      <div><h1>{course.name}</h1><p>سكاشن المقرر</p></div>
      <button className="button primary" onClick={onAdd}><Plus size={19} /> إضافة سكشن</button>
    </div>
    {course.sections.length === 0 && <Empty text="لا توجد سكاشن في هذا المقرر بعد." />}
    <ul className="m-0 grid list-none gap-2 p-0">
      {course.sections.map((section) => (
        <li className="record" key={section.id}>
          <button className="record-link" onClick={() => onOpen(section)}>
            <span className="tile-icon tone-0"><Layers3 size={21} /></span>
            <span><strong>{section.name}</strong><small>الطلاب · {number.format(section.students.length)}</small></span>
            <ArrowLeft size={18} className="record-arrow" />
          </button>
          <RecordActions name={section.name} onEdit={() => onEdit(section)} onDelete={() => onDelete(section)} />
        </li>
      ))}
    </ul>
  </section>
}

export function RosterView({ section, onAdd, onImport, onEdit, onDelete, importing }: {
  section: Section
  onAdd: () => void
  onImport: () => void
  onEdit: (student: Student) => void
  onDelete: (student: Student) => void
  importing: boolean
}) {
  return <section>
    <div className="section-heading detail">
      <div><h1>{section.name}</h1><p>قائمة الطلاب · {number.format(section.students.length)}</p></div>
      <div className="actions">
        <button className="button secondary" onClick={onImport} disabled={importing}>
          <FileUp size={18} /> {importing ? 'جارٍ قراءة الملف…' : 'استيراد من إكسيل'}
        </button>
        <button className="button primary" onClick={onAdd} disabled={importing}><Plus size={19} /> إضافة طالب</button>
      </div>
    </div>
    {section.students.length === 0 && <Empty text="أضف طالبًا أو استورد قائمة الطلاب من ملف إكسيل أو CSV." />}
    <ul className="m-0 grid list-none gap-2 p-0">
      {section.students.map((student) => (
        <li className="record" key={student.id}>
          <div className="record-link">
            <span className="tile-icon tone-1"><Users size={20} /></span>
            <span><strong>{student.name}</strong><small>الكود · <bdi>{student.code}</bdi></small></span>
          </div>
          <RecordActions name={student.name} disabled={importing} onEdit={() => onEdit(student)} onDelete={() => onDelete(student)} />
        </li>
      ))}
    </ul>
  </section>
}

function RecordActions({ name, disabled, onEdit, onDelete }: { name: string; disabled?: boolean; onEdit: () => void; onDelete: () => void }) {
  return <div className="record-actions">
    <button className="icon-button" aria-label={`تعديل ${name}`} onClick={onEdit} disabled={disabled}><Pencil size={17} /></button>
    <button className="icon-button delete" aria-label={`حذف ${name}`} onClick={onDelete} disabled={disabled}><Trash2 size={18} /></button>
  </div>
}

function Empty({ text }: { text: string }) {
  return <div className="empty"><FolderOpen size={28} /><p>{text}</p></div>
}
