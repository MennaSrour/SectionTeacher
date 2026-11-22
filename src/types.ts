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

export interface Section {
  id: string
  name: string
  students: Student[]
  sessions?: AttendanceSession[]
}

export interface Course {
  id: string
  name: string
  sections: Section[]
}

export type StudentDetails = Pick<Student, 'name' | 'code'>
