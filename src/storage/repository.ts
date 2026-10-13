import type {
  AttachmentRecord,
  BackupPayload,
  LineItem,
  MonthRecord,
  MonthStatus,
} from '../domain/types'
import { clampDateToMonth, defaultOccurredOn, deriveMonthStatus, occurredOnFromCreatedAt } from '../domain/calc'
import { getDb, monthIdFor } from './db'
import { listProperties } from './properties'
import { loadSettings, saveSettings } from './settings'

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
  const normalized: MonthRecord[] = []
  for (const month of all) {
    if (month.status === 'checked') {
      const next: MonthRecord = { ...month, status: 'open' }
      await db.put('months', next)
      normalized.push(next)
    } else normalized.push(month)
  }
  return normalized.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
}

/** Photos are no longer shown. Drop leftover blobs so they stop taking space. */
export async function purgeAttachments(): Promise<void> {
  const db = await getDb()
  const keys = await db.getAllKeys('attachments')
  if (keys.length === 0) return
  const tx = db.transaction('attachments', 'readwrite')
  await Promise.all(keys.map((key) => tx.store.delete(key)))
  await tx.done
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

export async function deleteLine(lineId: string): Promise<LineItem[]> {
  const db = await getDb()
  const line = await db.get('lines', lineId)
  if (!line) return []
  let victims: LineItem[] = [line]
  if (line.transferGroupId) {
    const all = await db.getAll('lines')
    victims = all.filter((l) => l.transferGroupId === line.transferGroupId)
  }
  for (const victim of victims) await db.delete('lines', victim.id)
  for (const monthId of new Set(victims.map((v) => v.monthId))) await refreshMonthStatus(monthId)
  return victims
}

export async function restoreLine(line: LineItem): Promise<void> {
  await restoreLines([line])
}

export async function restoreLines(items: LineItem[]): Promise<void> {
  const db = await getDb()
  for (const line of items) await db.put('lines', line)
  for (const monthId of new Set(items.map((l) => l.monthId))) await refreshMonthStatus(monthId)
}

export type TransferResult = { ok: true } | { ok: false; reason: 'currency' | 'closed' | 'amount' | 'same' }

/** Two linked lines: money leaves one property and arrives at the other. Not income or spending. */
export async function addTransfer(input: {
  fromPropertyId: string
  toPropertyId: string
  yearMonth: string
  amountCents: number
  note: string
}): Promise<TransferResult> {
  if (input.fromPropertyId === input.toPropertyId) return { ok: false, reason: 'same' }
  if (input.amountCents <= 0) return { ok: false, reason: 'amount' }
  const db = await getDb()
  const from = await db.get('properties', input.fromPropertyId)
  const to = await db.get('properties', input.toPropertyId)
  if (!from || !to) return { ok: false, reason: 'same' }
  if (from.currencyCode !== to.currencyCode) return { ok: false, reason: 'currency' }
  const fromMonth = await getOrCreateMonth(input.fromPropertyId, input.yearMonth)
  const toMonth = await getOrCreateMonth(input.toPropertyId, input.yearMonth)
  if (fromMonth.status === 'done' || toMonth.status === 'done') return { ok: false, reason: 'closed' }
  const groupId = crypto.randomUUID()
  const occurredOn = defaultOccurredOn(input.yearMonth)
  const base = Date.now()
  const note = input.note.trim()
  await db.put('lines', {
    id: crypto.randomUUID(),
    monthId: fromMonth.id,
    type: 'transfer',
    amountCents: input.amountCents,
    categoryId: '',
    note,
    occurredOn,
    createdAt: base,
    transferGroupId: groupId,
    transferDirection: 'out',
    counterpartyPropertyId: input.toPropertyId,
  })
  await db.put('lines', {
    id: crypto.randomUUID(),
    monthId: toMonth.id,
    type: 'transfer',
    amountCents: input.amountCents,
    categoryId: '',
    note,
    occurredOn,
    createdAt: base + 1,
    transferGroupId: groupId,
    transferDirection: 'in',
    counterpartyPropertyId: input.fromPropertyId,
  })
  await refreshMonthStatus(fromMonth.id)
  await refreshMonthStatus(toMonth.id)
  return { ok: true }
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
  const [properties, months, lines, categories] = await Promise.all([
    listProperties(),
    db.getAll('months'),
    db.getAll('lines'),
    db.getAll('categories'),
  ])
  return {
    version: 5,
    exportedAt: new Date().toISOString(),
    settings: loadSettings(),
    properties,
    categories,
    months,
    lines: lines.map(withOccurredOn),
    attachments: [],
  }
}

export function parseBackup(raw: unknown): BackupPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Partial<BackupPayload>
  const ver = p.version as number | undefined
  if (ver !== 3 && ver !== 4 && ver !== 5) return null
  if (!p.settings || typeof p.settings !== 'object') return null
  if (!Array.isArray(p.properties) || !Array.isArray(p.months) || !Array.isArray(p.lines) || !Array.isArray(p.categories)) return null
  return { ...(p as BackupPayload), version: 5, attachments: Array.isArray(p.attachments) ? p.attachments : [] }
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
  await Promise.all([
    ...payload.properties.map((p) => tx.objectStore('properties').put({ ...p, openingAsOf: p.openingAsOf ?? null })),
    ...payload.months.map((m) => tx.objectStore('months').put(m.status === 'checked' ? { ...m, status: 'open' as const } : m)),
    ...payload.lines.map((l) => tx.objectStore('lines').put(withOccurredOn(l))),
    ...payload.categories.map((c) => tx.objectStore('categories').put(c)),
  ])
  await tx.done
  saveSettings(payload.settings)
}
