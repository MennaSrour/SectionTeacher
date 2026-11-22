import { useMemo, useState } from 'react'
import { FileSpreadsheet, Printer } from 'lucide-react'
import type { Section, Student } from '../types'
import { exportSection, sectionReport } from '../services/reports'
import { number } from './Views'

const decimal = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 8 })
const percent = new Intl.NumberFormat('ar-EG', { style: 'percent', maximumFractionDigits: 1 })
const date = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'long' })

export function Reports({ courseName, section, onProfile }: { courseName: string; section: Section; onProfile: (student: Student) => void }) {
  const report = useMemo(() => sectionReport(section), [section])
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(false)

  async function download() {
    setExporting(true)
    setError(false)
    try {
      await exportSection(courseName, section)
    } catch {
      setError(true)
    } finally {
      setExporting(false)
    }
  }

  return <section aria-labelledby="report-heading">
    <div className="section-heading detail report-actions">
      <h1 id="report-heading">التقارير والتصدير</h1>
      <div className="actions">
        <button className="button primary" onClick={() => void download()} disabled={exporting}>
          <FileSpreadsheet size={18} /> {exporting ? 'جارٍ التصدير…' : 'تصدير إكسيل'}
        </button>
        <button className="button secondary" onClick={() => window.print()}><Printer size={18} /> حفظ كـ PDF / طباعة</button>
      </div>
    </div>
    {error && <p className="notice form-error report-actions" role="alert">تعذّر إنشاء ملف إكسيل. أعد المحاولة.</p>}
    <article className="print-report" dir="rtl" lang="ar">
      <header className="report-header">
        <h2>تقرير الحضور والتقييمات</h2>
        <dl>
          <div><dt>المقرر</dt><dd>{courseName}</dd></div>
          <div><dt>السكشن</dt><dd>{section.name}</dd></div>
          <div><dt>تاريخ التقرير</dt><dd>{date.format(new Date())}</dd></div>
        </dl>
      </header>
      <dl className="report-metrics">
        <div><dt>الطلاب</dt><dd>{number.format(report.rows.length)}</dd></div>
        <div><dt>الجلسات</dt><dd>{number.format(report.sessions.length)}</dd></div>
        <div><dt>التقييمات</dt><dd>{number.format(report.assessments.length)}</dd></div>
      </dl>
      {report.rows.length ? <div className="report-table-wrap" tabIndex={0} aria-label="جدول ملخص الطلاب">
        <table className="report-table">
          <caption className="sr-only">ملخص الحضور والدرجات لكل طالب</caption>
          <thead><tr>
            {['الكود', 'اسم الطالب', 'الحضور', 'الغياب', 'نسبة الغياب', 'البونص', 'الدرجة الكلية']
              .map((name) => <th scope="col" key={name}>{name}</th>)}
          </tr></thead>
          <tbody>{report.rows.map((row) => <tr key={row.student.id}>
            <td><bdi>{row.student.code}</bdi></td><th scope="row"><button className="student-name" onClick={() => onProfile(row.student)}>{row.student.name}</button></th>
            <td>{number.format(row.present)}</td><td>{number.format(row.absent)}</td>
            <td>{percent.format(row.absenceRate)}</td><td>{number.format(row.bonus)}</td><td>{decimal.format(row.total)}</td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="empty">لا يوجد طلاب في هذا السكشن.</p>}
    </article>
  </section>
}
