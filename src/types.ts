export interface Student {
  id: string
  name: string
  code: string
}

export type AttendanceStatus = 'present' | 'absent' | 'excused'

export interface AttendanceEntry {
  student: Student
  status?: AttendanceStatus
}

export interface AttendanceSession {
  id: string
  date: string
  label: string
  entries: AttendanceEntry[]
}

export interface AssessmentResult {
  submitted?: boolean
  score?: number
}

export interface UnmatchedSubmission {
  id: string
  row: number
  name: string
  code: string
}

export interface Assessment {
  id: string
  name: string
  maxScore?: number
  results: Record<string, AssessmentResult>
  unmatched?: UnmatchedSubmission[]
}

export interface Bonus {
  points: number
  note: string
}

export interface Section {
  id: string
  name: string
  students: Student[]
  sessions?: AttendanceSession[]
  assessments?: Assessment[]
  bonuses?: Record<string, Bonus>
}

export interface Course {
  id: string
  name: string
  sections: Section[]
}

export type StudentDetails = Pick<Student, 'name' | 'code'>
