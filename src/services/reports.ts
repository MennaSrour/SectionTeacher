import type { AttendanceStatus, Section } from '../types'

const statusLabels: Record<AttendanceStatus, string> = { present: 'حاضر', absent: 'غائب', excused: 'بعذر' }

export function sectionReport(section: Section) {
  const sessions = [...(section.sessions ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const assessments = section.assessments ?? []
  const sessionStatus = sessions.map((session) => new Map(session.entries.map((entry) => [entry.student.id, entry.status])))

  const rows = section.students.map((student) => {
    const statuses = sessionStatus.map((session) => session.get(student.id))
    const attendance = statuses.map((status) => status ? statusLabels[status] : '—')
    const present = statuses.filter((status) => status === 'present').length
    const absent = statuses.filter((status) => status === 'absent').length
    const grades = assessments.map((assessment) => assessment.results[student.id])
    const bonus = section.bonuses?.[student.id]?.points ?? 0
    const total = grades.reduce((sum, result) => sum + (result?.score ?? 0), bonus)
    return { student, attendance, present, absent, absenceRate: sessions.length ? absent / sessions.length : 0, grades, bonus, total }
  })
  return { sessions, assessments, rows }
}

export async function exportSection(courseName: string, section: Section) {
  const { utils, writeFile } = await import('xlsx')
  const { sessions, assessments, rows } = sectionReport(section)
  const attendanceHeaders = sessions.map((session, index) =>
    `الحضور ${index + 1} · ${session.date}${session.label ? ` · ${session.label}` : ''}`,
  )
  const gradeHeaders = assessments.flatMap((assessment, index) => [
    `تسليم ${index + 1} · ${assessment.name}`,
    `درجة ${index + 1} · ${assessment.name}${assessment.maxScore !== undefined ? ` / ${assessment.maxScore}` : ''}`,
  ])
  const headers = ['كود الطالب', 'اسم الطالب', ...attendanceHeaders, 'إجمالي الحضور', 'إجمالي الغياب', 'نسبة الغياب', ...gradeHeaders, 'البونص', 'الدرجة الكلية']
  const worksheet = utils.aoa_to_sheet([headers, ...rows.map((row) => [
    row.student.code, row.student.name, ...row.attendance, row.present, row.absent, row.absenceRate,
    ...row.grades.flatMap((grade) => [grade?.submitted ? 'تم التسليم' : 'لم يسلم', grade?.score ?? '']),
    row.bonus, row.total,
  ])])
  const percentColumn = 4 + sessions.length
  for (const [index] of rows.entries()) {
    worksheet[utils.encode_cell({ c: percentColumn, r: index + 1 })].z = '0.0%'
  }
  worksheet['!cols'] = headers.map((header, index) => ({ wch: index === 1 ? 26 : Math.min(42, Math.max(18, header.length + 2)) }))
  worksheet['!autofilter'] = { ref: worksheet['!ref']! }
  const workbook = utils.book_new()
  workbook.Workbook = { Views: [{ RTL: true }] }
  utils.book_append_sheet(workbook, worksheet, 'تقرير السكشن')
  const fileName = `${courseName} - ${section.name}`.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').slice(0, 120)
  writeFile(workbook, `${fileName}.xlsx`)
}
