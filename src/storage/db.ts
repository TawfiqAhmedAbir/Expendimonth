import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  AttachmentRecord,
  LineItem,
  MonthRecord,
  Property,
  UserCategory,
} from '../domain/types'

const DB_NAME = 'expendimonth'
const DB_VERSION = 3

export const LEGACY_PROPERTY_ID = 'prop-legacy'
const SETTINGS_KEY = 'expendimonth-settings'

interface ExpendiDB extends DBSchema {
  properties: {
    key: string
    value: Property
  }
  months: {
    key: string
    value: MonthRecord
    indexes: { 'by-propertyId': string; 'by-property-yearMonth': [string, string] }
  }
  lines: {
    key: string
    value: LineItem
    indexes: { 'by-monthId': string }
  }
  attachments: {
    key: string
    value: AttachmentRecord
  }
  categories: {
    key: string
    value: UserCategory
    indexes: { 'by-propertyId': string }
  }
}

export type ExpendiDatabase = IDBPDatabase<ExpendiDB>

let dbPromise: Promise<ExpendiDatabase> | null = null

export function monthIdFor(propertyId: string, yearMonth: string): string {
  return `${propertyId}:${yearMonth}`
}

type LegacySettings = {
  houseName?: string
  propertyName?: string
  propertyType?: Property['type']
  propertyTypeCustom?: string
  currencyCode?: string
  openingBalanceCents?: number
}

function readLegacySettings(): LegacySettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? (JSON.parse(raw) as LegacySettings) : null
  } catch {
    return null
  }
}

export function getDb(): Promise<ExpendiDatabase> {
  if (!dbPromise) {
    dbPromise = openDB<ExpendiDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const months = db.createObjectStore('months', { keyPath: 'id' })
          months.createIndex('by-propertyId', 'propertyId')
          months.createIndex('by-property-yearMonth', ['propertyId', 'yearMonth'], { unique: true })
          const lines = db.createObjectStore('lines', { keyPath: 'id' })
          lines.createIndex('by-monthId', 'monthId')
          db.createObjectStore('attachments', { keyPath: 'monthId' })
          const cats = db.createObjectStore('categories', { keyPath: 'id' })
          cats.createIndex('by-propertyId', 'propertyId')
          db.createObjectStore('properties', { keyPath: 'id' })
          return
        }

        if (oldVersion < 2 && !db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' })
        }

        if (oldVersion < 3) {
          // --- v3: multi-property. Build a property from legacy settings and re-key months. ---
          const props = db.createObjectStore('properties', { keyPath: 'id' })
          const legacy = readLegacySettings()
          const now = Date.now()
          const property: Property = {
            id: LEGACY_PROPERTY_ID,
            name: legacy?.propertyName?.trim() || legacy?.houseName?.trim() || 'My property',
            type: legacy?.propertyType ?? 'house',
            typeCustom: legacy?.propertyTypeCustom ?? '',
            currencyCode: legacy?.currencyCode ?? '',
            openingBalanceCents: legacy?.openingBalanceCents ?? 0,
            openingAsOf: null,
            color: '#1f4f5e',
            createdAt: now,
          }
          const hasLegacyData = Boolean(legacy?.currencyCode)
          if (hasLegacyData) props.put(property)

          const monthsStore = tx.objectStore('months')
          if (!monthsStore.indexNames.contains('by-propertyId')) {
            monthsStore.createIndex('by-propertyId', 'propertyId')
          }
          const legacyIndex = 'by-yearMonth' as unknown as 'by-propertyId'
          if (monthsStore.indexNames.contains(legacyIndex)) {
            monthsStore.deleteIndex(legacyIndex)
          }
          if (!monthsStore.indexNames.contains('by-property-yearMonth')) {
            monthsStore.createIndex('by-property-yearMonth', ['propertyId', 'yearMonth'], { unique: true })
          }

          const catsStore = tx.objectStore('categories')
          if (!catsStore.indexNames.contains('by-propertyId')) {
            catsStore.createIndex('by-propertyId', 'propertyId')
          }

          const linesStore = tx.objectStore('lines')
          const attStore = tx.objectStore('attachments')

          const oldMonths = (await monthsStore.getAll()) as unknown as Array<
            Partial<MonthRecord> & { id: string; yearMonth: string }
          >
          for (const old of oldMonths) {
            if (old.propertyId) continue
            const newId = monthIdFor(LEGACY_PROPERTY_ID, old.yearMonth)
            const updated: MonthRecord = {
              id: newId,
              propertyId: LEGACY_PROPERTY_ID,
              yearMonth: old.yearMonth,
              status: (old.status as MonthRecord['status']) ?? 'empty',
              reconcileInCents: old.reconcileInCents ?? null,
              reconcileOutCents: old.reconcileOutCents ?? null,
              closedAt: null,
            }
            await monthsStore.delete(old.id)
            await monthsStore.put(updated)

            const oldLines = await linesStore.index('by-monthId').getAll(old.id)
            for (const l of oldLines) {
              await linesStore.put({ ...l, monthId: newId })
            }
            const att = await attStore.get(old.id)
            if (att) {
              await attStore.delete(old.id)
              await attStore.put({ ...att, monthId: newId })
            }
          }

          const oldCats = (await catsStore.getAll()) as unknown as Array<Partial<UserCategory> & { id: string; label: string }>
          for (const c of oldCats) {
            if (c.propertyId) continue
            await catsStore.put({
              id: c.id,
              propertyId: LEGACY_PROPERTY_ID,
              label: c.label,
              icon: null,
              createdAt: c.createdAt ?? now,
              lastUsedAt: c.lastUsedAt ?? now,
              lastAmountCents: null,
              useCount: 0,
            })
          }
        }
      },
    })
  }
  return dbPromise
}
