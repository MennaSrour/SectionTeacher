export interface Student {
  id: string
  name: string
  code: string
}

export interface Section {
  id: string
  name: string
  students: Student[]
}

export interface Course {
  id: string
  name: string
  sections: Section[]
}

export type StudentDetails = Pick<Student, 'name' | 'code'>
