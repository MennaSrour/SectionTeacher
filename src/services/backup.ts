import type { Course } from '../types'

const format = 'section-teacher-backup'
const maxFileBytes = 24 * 1024 * 1024
type RecordValue = Record<string, unknown>
type Validator = (value: unknown) => boolean

const object = (value: unknown): value is RecordValue => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string'
const name = (value: unknown) => text(value) && !!value.trim()
const id = (value: unknown) => text(value) && /^[\w-]+$/.test(value) && value !== 'prototype' && !Object.prototype.hasOwnProperty.call(Object.prototype, value)
const score = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0
const optional = (value: unknown, validate: Validator) => value === undefined || validate(value)

function records(value: unknown, validate: Validator) {
  return object(value) && Object.entries(value).every(([key, item]) => id(key) && validate(item))
}

function list(value: unknown, validate: Validator) {
  if (!Array.isArray(value)) return false
  const ids = new Set<string>()
  return value.every((item) => {
    if (!object(item) || !text(item.id) || ids.has(item.id) || !validate(item)) return false
    ids.add(item.id)
    return true
  })
}

function date(value: unknown) {
  if (!text(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

const student = (value: unknown) => object(value) && id(value.id) && name(value.name) && text(value.code)
const status = (value: unknown) => value === 'present' || value === 'absent' || value === 'excused'
const result = (value: unknown) => object(value) && optional(value.submitted, (item) => typeof item === 'boolean') && optional(value.score, score)
const bonus = (value: unknown) => object(value) && typeof value.points === 'number' && Number.isSafeInteger(value.points) && text(value.note)
const unmatched = (value: unknown) => object(value) && id(value.id) && typeof value.row === 'number'
  && Number.isSafeInteger(value.row) && value.row >= 1 && text(value.name) && text(value.code)

function session(value: unknown) {
  if (!object(value) || !id(value.id) || !date(value.date) || !text(value.label) || !Array.isArray(value.entries)) return false
  const ids = new Set<unknown>()
  return value.entries.every((item: unknown) => {
    if (!object(item) || !object(item.student) || !student(item.student) || !optional(item.status, status)
        || ids.has(item.student.id)) return false
    ids.add(item.student.id)
    return true
  })
}

const assessment = (value: unknown) => object(value) && id(value.id) && value.id !== 'bonus' && name(value.name)
  && optional(value.maxScore, score) && records(value.results, result) && optional(value.unmatched, (items) => list(items, unmatched))

const section = (value: unknown) => object(value) && id(value.id) && name(value.name)
  && list(value.students, student) && optional(value.sessions, (items) => list(items, session))
  && optional(value.assessments, (items) => list(items, assessment))
  && optional(value.bonuses, (items) => records(items, bonus))
  && optional(value.studentNotes, (items) => records(items, text))

const course = (value: unknown) => object(value) && id(value.id) && name(value.name) && list(value.sections, section)

export async function readBackup(file: File): Promise<Course[]> {
  if (file.size > maxFileBytes) throw new Error('حجم ملف النسخة الاحتياطية أكبر من ٢٤ ميغابايت.')
  let data: unknown
  try {
    data = JSON.parse((await file.text()).replace(/^\uFEFF/, ''), (key, value: unknown) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') throw new Error()
      return value
    })
  } catch {
    throw new Error('تعذّرت قراءة ملف JSON. اختر ملف نسخة احتياطية صالحًا.')
  }
  if (!object(data) || data.format !== format || data.version !== 1 || !list(data.courses, course)) {
    throw new Error('ملف النسخة الاحتياطية غير صالح أو إصداره غير مدعوم.')
  }
  return data.courses as Course[]
}

export function downloadBackup(courses: Course[]) {
  const date = new Date()
  const blob = new Blob([JSON.stringify({ format, version: 1, exportedAt: date.toISOString(), courses })], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `section-teacher-${date.toISOString().slice(0, 10)}.json`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
