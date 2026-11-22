import type { StudentDetails } from '../types'

export interface Sheet {
  headers: string[]
  rows: string[][]
  nameColumn: number
  codeColumn: number
}

const nameHeaders = ['اسم', 'الاسم', 'اسم الطالب', 'الاسم الكامل', 'name', 'student name', 'full name']
const codeHeaders = ['كود', 'الكود', 'كود الطالب', 'رقم الطالب', 'الرقم الجامعي', 'رقم جامعي', 'id', 'student id', 'student code', 'code']

function normalize(header: string) {
  return header.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/[\u064b-\u065f\u0640]/g, '').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim()
}

function findColumn(headers: string[], aliases: string[]) {
  const matches = headers.map(normalize).flatMap((header, index) => aliases.includes(header) ? [index] : [])
  return matches.length === 1 ? matches[0] : -1
}

export async function readSheet(file: File): Promise<Sheet> {
  if (!/\.(xlsx|csv)$/i.test(file.name)) throw new Error('اختر ملفًا بصيغة XLSX أو CSV.')
  if (file.size > 5 * 1024 * 1024) throw new Error('حجم الملف المسموح به ٥ ميغابايت.')
  const { read, utils } = await import('xlsx')
  const csv = /\.csv$/i.test(file.name)
  const input = csv ? await file.text() : await file.arrayBuffer()
  const workbook = read(input, { type: csv ? 'string' : 'array', raw: true, sheetRows: 10002, sheets: 0 })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!worksheet) throw new Error('الملف لا يحتوي على ورقة بيانات.')
  const [headers, ...rows] = utils.sheet_to_json<string[]>(worksheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  })
  if (!headers || headers.length < 2 || rows.length === 0) {
    throw new Error('أضف صف عناوين وبيانات طالب واحد على الأقل.')
  }
  if (rows.length > 10000) throw new Error('يمكن استيراد ١٠٬٠٠٠ صف في كل مرة.')
  return {
    headers,
    rows,
    nameColumn: findColumn(headers, nameHeaders),
    codeColumn: findColumn(headers, codeHeaders),
  }
}

export function mapStudents(sheet: Sheet, nameColumn: number, codeColumn: number) {
  return sheet.rows.map((row): StudentDetails => ({
    name: (row[nameColumn] ?? '').trim(),
    code: (row[codeColumn] ?? '').trim(),
  }))
}
