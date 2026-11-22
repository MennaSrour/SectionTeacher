import type { Assessment, Student, StudentDetails, UnmatchedSubmission } from '../types'

export function normalizeName(name: string) {
  return name.normalize('NFKC').toLowerCase().replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '').trim().replace(/\s+/g, ' ')
}

function normalizeCode(code: string) {
  return code.normalize('NFKC').trim().toUpperCase()
    .replace(/[٠-٩۰-۹]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) % 10))
}

function uniqueStudentIndex(students: Student[], key: (student: Student) => string) {
  const index = new Map<string, string | null>()
  for (const student of students) {
    const value = key(student)
    if (value) index.set(value, index.has(value) ? null : student.id)
  }
  return index
}

export function matchSubmissions(rows: StudentDetails[], students: Student[]) {
  const codeIndex = uniqueStudentIndex(students, (student) => normalizeCode(student.code))
  const nameIndex = uniqueStudentIndex(students, (student) => normalizeName(student.name))
  const matches = new Set<string>()
  const unmatched: UnmatchedSubmission[] = []
  for (const [index, row] of rows.entries()) {
    const studentId = codeIndex.get(normalizeCode(row.code)) ?? nameIndex.get(normalizeName(row.name))
    if (studentId) matches.add(studentId)
    else unmatched.push({ ...row, id: crypto.randomUUID(), row: index + 1 })
  }
  return { matches, unmatched }
}

export function markSubmitted(assessment: Assessment, studentIds: Iterable<string>) {
  const results = { ...assessment.results }
  for (const id of studentIds) results[id] = { ...results[id], submitted: true }
  return { ...assessment, results }
}
