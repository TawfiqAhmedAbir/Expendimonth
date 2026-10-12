import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const DB_NAME = 'expendimonth'
const DB_VERSION = 1

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
}

let dbPromise: Promise<IDBPDatabase<ExpendiDB>> | null = null

export function getDb(): Promise<IDBPDatabase<ExpendiDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ExpendiDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const months = db.createObjectStore('months', { keyPath: 'id' })
        months.createIndex('by-yearMonth', 'yearMonth', { unique: true })

        const lines = db.createObjectStore('lines', { keyPath: 'id' })
        lines.createIndex('by-monthId', 'monthId')

        db.createObjectStore('attachments', { keyPath: 'monthId' })
      },
    })
  }
  return dbPromise
}
