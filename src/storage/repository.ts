import type {
  AttachmentRecord,
  BackupPayload,
  LineItem,
  MonthRecord,
  Settings,
} from '../domain/types'
import { deriveMonthStatus } from '../domain/calc'
import { getDb } from './db'

const SETTINGS_KEY = 'expendimonth-settings'

const defaultSettings = (): Settings => ({
  houseName: '',
  currencyCode: '',
  openingBalanceCents: 0,
  locale: 'en',
})

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings()
    return { ...defaultSettings(), ...JSON.parse(raw) } as Settings
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function isSetupComplete(): boolean {
  const s = loadSettings()
  return Boolean(s.currencyCode && s.houseName.trim())
}

function monthIdFor(yearMonth: string): string {
  return `month-${yearMonth}`
}

export async function getOrCreateMonth(yearMonth: string): Promise<MonthRecord> {
  const db = await getDb()
  const id = monthIdFor(yearMonth)
  const existing = await db.get('months', id)
  if (existing) return existing

  const record: MonthRecord = {
    id,
    yearMonth,
    status: 'empty',
    reconcileInCents: null,
    reconcileOutCents: null,
  }
  await db.put('months', record)
  return record
}

export async function listMonths(): Promise<MonthRecord[]> {
  const db = await getDb()
  const all = await db.getAll('months')
  return all.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
}

export async function getMonthByYearMonth(yearMonth: string): Promise<MonthRecord | undefined> {
  const db = await getDb()
  return db.get('months', monthIdFor(yearMonth))
}

async function refreshMonthStatus(monthId: string): Promise<void> {
  const db = await getDb()
  const month = await db.get('months', monthId)
  if (!month) return
  const lines = await getLinesForMonth(monthId)
  const markedDone = month.status === 'done'
  const nextStatus = deriveMonthStatus(lines, markedDone)
  if (nextStatus !== month.status) {
    await db.put('months', { ...month, status: nextStatus })
  }
}

export async function getLinesForMonth(monthId: string): Promise<LineItem[]> {
  const db = await getDb()
  const lines = await db.getAllFromIndex('lines', 'by-monthId', monthId)
  return lines.sort((a, b) => a.createdAt - b.createdAt)
}

export async function addLine(
  monthId: string,
  partial: Omit<LineItem, 'id' | 'monthId' | 'createdAt'>,
): Promise<LineItem> {
  const db = await getDb()
  const line: LineItem = {
    id: crypto.randomUUID(),
    monthId,
    createdAt: Date.now(),
    ...partial,
  }
  await db.put('lines', line)
  const month = await db.get('months', monthId)
  if (month?.status === 'done') {
    await db.put('months', { ...month, status: 'open' })
  }
  await refreshMonthStatus(monthId)
  return line
}

export async function updateLine(line: LineItem): Promise<void> {
  const db = await getDb()
  await db.put('lines', line)
  await refreshMonthStatus(line.monthId)
}

export async function deleteLine(lineId: string): Promise<LineItem | undefined> {
  const db = await getDb()
  const line = await db.get('lines', lineId)
  if (!line) return undefined
  await db.delete('lines', lineId)
  await refreshMonthStatus(line.monthId)
  return line
}

export async function restoreLine(line: LineItem): Promise<void> {
  const db = await getDb()
  await db.put('lines', line)
  await refreshMonthStatus(line.monthId)
}

export async function copyLinesFromMonth(sourceMonthId: string, targetMonthId: string): Promise<number> {
  const source = await getLinesForMonth(sourceMonthId)
  if (source.length === 0) return 0
  const db = await getDb()
  let count = 0
  for (const s of source) {
    const copy: LineItem = {
      ...s,
      id: crypto.randomUUID(),
      monthId: targetMonthId,
      createdAt: Date.now() + count,
    }
    await db.put('lines', copy)
    count++
  }
  await refreshMonthStatus(targetMonthId)
  return count
}

export async function setMonthDone(monthId: string, done: boolean): Promise<void> {
  const db = await getDb()
  const month = await db.get('months', monthId)
  if (!month) return
  const lines = await getLinesForMonth(monthId)
  const status = done ? 'done' : deriveMonthStatus(lines, false)
  await db.put('months', { ...month, status })
}

export async function setMonthReconcile(
  monthId: string,
  reconcileInCents: number | null,
  reconcileOutCents: number | null,
): Promise<void> {
  const db = await getDb()
  const month = await db.get('months', monthId)
  if (!month) return
  await db.put('months', {
    ...month,
    reconcileInCents,
    reconcileOutCents,
  })
}

export async function saveAttachment(monthId: string, file: File): Promise<void> {
  const db = await getDb()
  const record: AttachmentRecord = {
    monthId,
    blob: file,
    mimeType: file.type || 'image/jpeg',
    updatedAt: Date.now(),
  }
  await db.put('attachments', record)
}

export async function getAttachment(monthId: string): Promise<AttachmentRecord | undefined> {
  const db = await getDb()
  return db.get('attachments', monthId)
}

export async function buildBackup(): Promise<BackupPayload> {
  const db = await getDb()
  const months = await db.getAll('months')
  const lines = await db.getAll('lines')
  const attachmentsRaw = await db.getAll('attachments')
  const attachments = await Promise.all(
    attachmentsRaw.map(async (a) => {
      const buf = await a.blob.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
      return {
        monthId: a.monthId,
        mimeType: a.mimeType,
        base64: btoa(binary),
      }
    }),
  )
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: loadSettings(),
    months,
    lines,
    attachments,
  }
}

export async function getAllLinesGrouped(): Promise<Map<string, LineItem[]>> {
  const db = await getDb()
  const lines = await db.getAll('lines')
  const map = new Map<string, LineItem[]>()
  for (const line of lines) {
    const arr = map.get(line.monthId) ?? []
    arr.push(line)
    map.set(line.monthId, arr)
  }
  for (const [k, arr] of map) {
    map.set(
      k,
      arr.sort((a, b) => a.createdAt - b.createdAt),
    )
  }
  return map
}
