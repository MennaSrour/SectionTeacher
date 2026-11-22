import type { Course } from '../types'

export interface CourseStore {
  load(): Promise<Course[]>
  save(courses: Course[]): Promise<void>
}

const key = 'section-teacher.courses.v1'

const initialCourses: Course[] = [
  { id: 'programming', name: 'برمجة ١', sections: [
    { id: 'sunday', name: 'سكشن ١ - الأحد', students: [] },
    { id: 'tuesday', name: 'سكشن ٢ - الثلاثاء', students: [] },
  ] },
  { id: 'databases', name: 'قواعد البيانات', sections: [] },
  { id: 'networks', name: 'شبكات الحاسب', sections: [] },
]

export const courseStore: CourseStore = {
  async load() {
    const saved = localStorage.getItem(key)
    if (saved === null) return structuredClone(initialCourses)
    const courses: unknown = JSON.parse(saved)
    if (!Array.isArray(courses)) throw new Error('Invalid course storage')
    return courses
  },
  async save(courses) {
    localStorage.setItem(key, JSON.stringify(courses))
  },
}
