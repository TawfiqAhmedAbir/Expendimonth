import type {
  AttachmentRecord,
  BackupPayload,
  LineItem,
  MonthRecord,
  MonthStatus,
} from '../domain/types'
import { clampDateToMonth, deriveMonthStatus, occurredOnFromCreatedAt } from '../domain/calc'
import { getDb, monthIdFor } from './db'
import { listProperties } from './properties'
import { loadSettings, patchSettings, saveSettings } from './settings'

export { loadSettings, saveSettings, patchSettings } from './settings'

export function isSetupComplete(): boolean {
  const s = loadSettings()
  return Boolean(s.userName.trim() && s.activePropertyId)
}

// ---------- Months ----------

export async function getOrCreateMonth(propertyId: string, yearMonth: string): Promise<MonthRecord> {
  const db = await getDb()
  const id = monthIdFor(propertyId, yearMonth)
  const existing = await db.get('months', id)
  if (existing) return existing
  const record: MonthRecord = {
    id,
    propertyId,
    yearMonth,
    status: 'empty',
    reconcileInCents: null,
    reconcileOutCents: null,
    closedAt: null,
  }
  await db.put('months', record)
  return record
}

export async function listMonths(propertyId: string): Promise<MonthRecord[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('months', 'by-propertyId', propertyId)
  return all.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
}

export async function getMonth(monthId: string): Promise<MonthRecord | undefined> {
  const db = await getDb()
  return db.get('months', monthId)
}

async function refreshMonthStatus(monthId: string): Promise<void> {
  const db = await getDb()
  const month = await db.get('months', monthId)
  if (!month) return
  const lines = await getLinesForMonth(monthId)
  const next = deriveMonthStatus(lines, month.status)
  if (next !== month.status) await db.put('months', { ...month, status: next })
}

export async function setMonthStatus(monthId: string, status: MonthStatus): Promise<void> {
  const db = await getDb()
  const month = await db.get('months', monthId)
  if (!month) return
  await db.put('months', {
    ...month,
    status,
    closedAt: status === 'done' ? Date.now() : null,
  })
}

export async function setMonthReconcile(
  monthId: string,
  reconcileInCents: number | null,
  reconcileOutCents: number | null,
): Promise<void> {
  const db = await getDb()
  const month = await db.get('months', monthId)
  if (!month) return
  await db.put('months', { ...month, reconcileInCents, reconcileOutCents })
}

// ---------- Lines ----------

function yearMonthOf(monthId: string): string {
  return monthId.slice(monthId.lastIndexOf(':') + 1)
}

/** Older lines have no day. Fill one from when they were typed, inside their month. */
export function withOccurredOn(line: LineItem): LineItem {
  const ym = yearMonthOf(line.monthId)
  const raw = line.occurredOn
  const occurredOn = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? clampDateToMonth(raw, ym) : occurredOnFromCreatedAt(line.createdAt, ym)
  return occurredOn === line.occurredOn ? line : { ...line, occurredOn }
}

function sortLines(lines: LineItem[]): LineItem[] {
  return lines.map(withOccurredOn).sort((a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.createdAt - b.createdAt)
}

export async function getLinesForMonth(monthId: string): Promise<LineItem[]> {
  const db = await getDb()
  const lines = await db.getAllFromIndex('lines', 'by-monthId', monthId)
  return sortLines(lines)
}

export async function addLine(
  monthId: string,
  partial: Omit<LineItem, 'id' | 'monthId' | 'createdAt'>,
): Promise<LineItem> {
  const db = await getDb()
  const line: LineItem = { id: crypto.randomUUID(), monthId, createdAt: Date.now(), ...partial }
  await db.put('lines', line)
  await refreshMonthStatus(monthId)
  return line
}

export async function addLines(
  monthId: string,
  partials: Omit<LineItem, 'id' | 'monthId' | 'createdAt'>[],
): Promise<number> {
  const db = await getDb()
  const base = Date.now()
  await Promise.all(
    partials.map((p, i) =>
      db.put('lines', { id: crypto.randomUUID(), monthId, createdAt: base + i, ...p }),
    ),
  )
  await refreshMonthStatus(monthId)
  return partials.length
}

export async function updateLine(line: LineItem): Promise<void> {
  const db = await getDb()
  const prev = await db.get('lines', line.id)
  await db.put('lines', withOccurredOn(line))
  await refreshMonthStatus(line.monthId)
  if (prev && prev.monthId !== line.monthId) await refreshMonthStatus(prev.monthId)
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

/** All lines for a property grouped by monthId. */
export async function getLinesGrouped(propertyId: string): Promise<Map<string, LineItem[]>> {
  const db = await getDb()
  const months = await db.getAllFromIndex('months', 'by-propertyId', propertyId)
  const map = new Map<string, LineItem[]>()
  await Promise.all(
    months.map(async (m) => {
      const lines = await db.getAllFromIndex('lines', 'by-monthId', m.id)
      map.set(m.id, sortLines(lines))
    }),
  )
  return map
}

// ---------- Attachments ----------

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

export async function deleteAttachment(monthId: string): Promise<void> {
  const db = await getDb()
  await db.delete('attachments', monthId)
}

// ---------- Backup ----------

export async function buildBackup(): Promise<BackupPayload> {
  const db = await getDb()
  const [properties, months, lines, categories, attachmentsRaw] = await Promise.all([
    listProperties(),
    db.getAll('months'),
    db.getAll('lines'),
    db.getAll('categories'),
    db.getAll('attachments'),
  ])
  const attachments = await Promise.all(
    attachmentsRaw.map(async (a) => {
      const bytes = new Uint8Array(await a.blob.arrayBuffer())
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
      return { monthId: a.monthId, mimeType: a.mimeType, base64: btoa(binary) }
    }),
  )
  patchSettings({ lastExportAt: Date.now() })
  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    settings: loadSettings(),
    properties,
    categories,
    months,
    lines: lines.map(withOccurredOn),
    attachments,
  }
}

export function parseBackup(raw: unknown): BackupPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Partial<BackupPayload>
  if (p.version !== 3) return null
  if (!p.settings || typeof p.settings !== 'object') return null
  if (!Array.isArray(p.properties) || !Array.isArray(p.months) || !Array.isArray(p.lines) || !Array.isArray(p.categories) || !Array.isArray(p.attachments)) return null
  return p as BackupPayload
}

/** Replace everything on this phone with a version-3 backup file. */
export async function restoreBackup(payload: BackupPayload): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['properties', 'months', 'lines', 'attachments', 'categories'], 'readwrite')
  await Promise.all([
    tx.objectStore('properties').clear(),
    tx.objectStore('months').clear(),
    tx.objectStore('lines').clear(),
    tx.objectStore('categories').clear(),
    tx.objectStore('attachments').clear(),
  ])
  const attachments: AttachmentRecord[] = payload.attachments.map((a) => {
    const binary = atob(a.base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return { monthId: a.monthId, mimeType: a.mimeType, blob: new Blob([bytes], { type: a.mimeType }), updatedAt: Date.now() }
  })
  await Promise.all([
    ...payload.properties.map((p) => tx.objectStore('properties').put(p)),
    ...payload.months.map((m) => tx.objectStore('months').put(m)),
    ...payload.lines.map((l) => tx.objectStore('lines').put(withOccurredOn(l))),
    ...payload.categories.map((c) => tx.objectStore('categories').put(c)),
    ...attachments.map((a) => tx.objectStore('attachments').put(a)),
  ])
  await tx.done
  saveSettings(payload.settings)
}
