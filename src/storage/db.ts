import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const DB_NAME = 'expendimonth'
const DB_VERSION = 2

interface ExpendiDB extends DBSchema {
  months: {
    key: string
    value: import('../domain/types').MonthRecord
    indexes: { 'by-yearMonth': string }
  }
  lines: {
    key: string
    value: import('../domain/types').LineItem
    indexes: { 'by-monthId': string }
  }
  attachments: {
    key: string
    value: import('../domain/types').AttachmentRecord
  }
  categories: {
    key: string
    value: import('../domain/types').UserCategory
  }
}

let dbPromise: Promise<IDBPDatabase<ExpendiDB>> | null = null

export function getDb(): Promise<IDBPDatabase<ExpendiDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ExpendiDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('months')) {
          const months = db.createObjectStore('months', { keyPath: 'id' })
          months.createIndex('by-yearMonth', 'yearMonth', { unique: true })
        }
        if (!db.objectStoreNames.contains('lines')) {
          const lines = db.createObjectStore('lines', { keyPath: 'id' })
          lines.createIndex('by-monthId', 'monthId')
        }
        if (!db.objectStoreNames.contains('attachments')) {
          db.createObjectStore('attachments', { keyPath: 'monthId' })
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}
