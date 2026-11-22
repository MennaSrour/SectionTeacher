import { useEffect, useRef, useState } from 'react'
import { BookOpen, ChevronLeft, GraduationCap, HardDrive, LayoutGrid } from 'lucide-react'
import { Editor, type EditorState } from './components/Editor'
import { CourseView, Dashboard, number, RosterView } from './components/Views'
import { courseStore } from './services/storage'
import { mapStudents, readSheet } from './services/spreadsheet'
import type { Course, Section, StudentDetails } from './types'

const saveError = 'تعذّر حفظ التغييرات على هذا الجهاز.'
const getRoute = () => location.hash.slice(1).split('/')

export default function App() {
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [[courseId, sectionId], setRoute] = useState(getRoute)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const pending = useRef(false)
  const navigation = useRef(0)
  const course = courses?.find((item) => item.id === courseId)
  const section = course?.sections.find((item) => item.id === sectionId)

  useEffect(() => {
    let active = true
    courseStore.load().then(
      (data) => { if (active) setCourses(data) },
      () => { if (active) setLoadError(true) },
    )
    return () => { active = false }
  }, [])

  useEffect(() => {
    const update = () => {
      navigation.current += 1
      setRoute(getRoute())
      setEditor(null)
      setNotice(null)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  async function persist(next: Course[]) {
    if (pending.current) return 'انتظر حتى يكتمل الحفظ.'
    pending.current = true
    try {
      await courseStore.save(next)
      setCourses(next)
    } catch {
      return saveError
    } finally {
      pending.current = false
    }
  }

  function updateSections(change: (sections: Section[]) => Section[]) {
    if (!courses || !course) return Promise.resolve(saveError)
    return persist(courses.map((item) =>
      item.id === course.id ? { ...item, sections: change(item.sections) } : item,
    ))
  }

  function updateRoster(students: Section['students']) {
    return updateSections((sections) => sections.map((item) =>
      item.id === section?.id ? { ...item, students } : item,
    ))
  }

  async function saveEditor(details: StudentDetails) {
    if (!editor || !courses) return saveError
    const id = editor.type !== 'import' && editor.id ? editor.id : crypto.randomUUID()
    switch (editor.type) {
      case 'course':
        return persist([...courses, { id, name: details.name, sections: [] }])
      case 'section':
        return updateSections((sections) => editor.id
          ? sections.map((item) => item.id === id ? { ...item, name: details.name } : item)
          : [...sections, { id, name: details.name, students: [] }])
      case 'delete-section':
        return updateSections((sections) => sections.filter((item) => item.id !== id))
      case 'student':
        if (!section) return saveError
        if (section.students.some((student) => student.code === details.code && student.id !== id)) {
          return 'هذا الكود مسجّل بالفعل في السكشن.'
        }
        return updateRoster(editor.id
          ? section.students.map((student) => student.id === id ? { ...details, id } : student)
          : [...section.students, { ...details, id }])
      case 'delete-student':
        return section ? updateRoster(section.students.filter((student) => student.id !== id)) : saveError
      default:
        return saveError
    }
  }

  async function importStudents(rows: StudentDetails[]) {
    if (!section) return saveError
    const codes = new Set(section.students.map((student) => student.code))
    const added = []
    for (const student of rows) {
      if (!student.name || !student.code || codes.has(student.code)) continue
      codes.add(student.code)
      added.push({ ...student, id: crypto.randomUUID() })
    }
    if (added.length === 0) return 'لم يُعثر على طلاب جدد. تحقّق من الأعمدة والأكواد المكررة.'
    const error = await updateRoster([...section.students, ...added])
    if (error) return error
    const skipped = rows.length - added.length
    const summary = `تم استيراد ${number.format(added.length)} من الطلاب.`
    setNotice({ text: skipped ? `${summary} تم تخطّي ${number.format(skipped)} من الصفوف لوجود بيانات ناقصة أو أكواد مكررة.` : summary })
  }

  async function importFile(file: File) {
    const route = navigation.current
    setNotice(null)
    setImporting(true)
    try {
      let sheet
      try {
        sheet = await readSheet(file)
      } catch (error) {
        if (route !== navigation.current) return
        const message = error instanceof Error && /[\u0600-\u06ff]/.test(error.message)
          ? error.message : 'تعذّرت قراءة الملف. تحقّق من صيغته ثم أعد المحاولة.'
        setNotice({ text: message, error: true })
        return
      }
      if (route !== navigation.current) return
      if (sheet.nameColumn === -1 || sheet.codeColumn === -1) {
        setEditor({ type: 'import', sheet })
        return
      }
      const error = await importStudents(mapStudents(sheet, sheet.nameColumn, sheet.codeColumn))
      if (error) setNotice({ text: error, error: true })
    } finally {
      setImporting(false)
    }
  }

  return <div className="shell">
    <aside className="sidebar">
      <a href="#" className="brand">
        <span className="brand-icon"><GraduationCap size={26} /></span>
        <span><strong>سكشن</strong><small>مساحة المعيد</small></span>
      </a>
      <nav aria-label="القائمة الرئيسية">
        <a className="nav-link" href="#" aria-current={!course ? 'page' : undefined}><LayoutGrid size={19} /> المقررات</a>
      </nav>
      <div className="local"><HardDrive size={17} /> تخزين على هذا الجهاز</div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <nav aria-label="مسار التنقل">
          <a href="#"><BookOpen size={18} /> المقررات</a>
          {course && <><ChevronLeft size={15} /><a href={`#${course.id}`}>{course.name}</a></>}
          {section && <><ChevronLeft size={15} /><span aria-current="page">{section.name}</span></>}
        </nav>
      </header>
      <main className="content">
        {notice && <div className={`notice ${notice.error ? 'form-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{notice.text}</div>}
        {loadError ? <p className="notice form-error" role="alert">تعذّر قراءة البيانات المخزنة على هذا الجهاز.</p>
          : !courses ? <p role="status">جارٍ تحميل المقررات…</p>
          : course && section ? <RosterView section={section} importing={importing}
              onAdd={() => setEditor({ type: 'student', title: 'إضافة طالب' })}
              onImport={() => fileInput.current?.click()}
              onEdit={(student) => setEditor({ type: 'student', title: 'تعديل طالب', ...student })}
              onDelete={(student) => setEditor({ type: 'delete-student', id: student.id, name: student.name })} />
          : course ? <CourseView course={course}
              onAdd={() => setEditor({ type: 'section', title: 'إضافة سكشن' })}
              onOpen={(item) => { location.hash = `${course.id}/${item.id}` }}
              onEdit={(item) => setEditor({ type: 'section', title: 'تعديل سكشن', id: item.id, name: item.name })}
              onDelete={(item) => setEditor({ type: 'delete-section', id: item.id, name: item.name })} />
          : <Dashboard courses={courses} onAdd={() => setEditor({ type: 'course', title: 'إضافة مقرر' })}
              onOpen={(item) => { location.hash = item.id }} />}
      </main>
    </div>
    <input ref={fileInput} type="file" accept=".xlsx,.csv" hidden onChange={(event) => {
      const file = event.currentTarget.files?.[0]
      event.currentTarget.value = ''
      if (file && !importing) void importFile(file)
    }} />
    {editor && <Editor editor={editor} onClose={() => setEditor(null)} onSave={saveEditor} onImport={importStudents} />}
  </div>
}
