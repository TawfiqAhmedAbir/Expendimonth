export type LineType = 'in' | 'out'

export type MonthStatus = 'empty' | 'open' | 'checked' | 'done'

export type PropertyType = 'house' | 'land' | 'vehicle' | 'business' | 'other'

export type ThemeMode = 'light' | 'dark'

export type Property = {
  id: string
  name: string
  type: PropertyType
  typeCustom: string
  currencyCode: string
  openingBalanceCents: number
  color: string
  createdAt: number
}

export type Settings = {
  userName: string
  locale: string
  activePropertyId: string | null
  theme: ThemeMode
  pinHash: string | null
  pinSalt: string | null
  lastExportAt: number | null
  coachDismissed: boolean
}

export type UserCategory = {
  id: string
  propertyId: string
  label: string
  icon: string | null
  createdAt: number
  lastUsedAt: number
  lastAmountCents: number | null
  useCount: number
}

export type MonthRecord = {
  id: string
  propertyId: string
  yearMonth: string
  status: MonthStatus
  reconcileInCents: number | null
  reconcileOutCents: number | null
  closedAt: number | null
}

export type LineItem = {
  id: string
  monthId: string
  type: LineType
  amountCents: number
  categoryId: string
  note: string
  /** Calendar day the money moved, YYYY-MM-DD, inside the line's month. */
  occurredOn: string
  createdAt: number
}

export type AttachmentRecord = {
  monthId: string
  blob: Blob
  mimeType: string
  updatedAt: number
}

export type BackupPayload = {
  version: 3
  exportedAt: string
  settings: Settings
  properties: Property[]
  categories: UserCategory[]
  months: MonthRecord[]
  lines: LineItem[]
  attachments: { monthId: string; mimeType: string; base64: string }[]
}

export type PropertySnapshot = {
  property: Property
  months: MonthRecord[]
  lines: LineItem[]
  categories: UserCategory[]
  attachments: AttachmentRecord[]
}
