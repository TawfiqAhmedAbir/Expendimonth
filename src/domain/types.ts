export type LineType = 'in' | 'out'

export type MonthStatus = 'empty' | 'open' | 'done'

export type PropertyType = 'house' | 'land' | 'vehicle' | 'business' | 'other'

export type Settings = {
  userName: string
  propertyName: string
  propertyType: PropertyType
  propertyTypeCustom: string
  currencyCode: string
  openingBalanceCents: number
  locale: string
}

export type UserCategory = {
  id: string
  label: string
  createdAt: number
  lastUsedAt: number
}

export type MonthRecord = {
  id: string
  yearMonth: string
  status: MonthStatus
  reconcileInCents: number | null
  reconcileOutCents: number | null
}

export type LineItem = {
  id: string
  monthId: string
  type: LineType
  amountCents: number
  categoryId: string
  note: string
  createdAt: number
}

export type AttachmentRecord = {
  monthId: string
  blob: Blob
  mimeType: string
  updatedAt: number
}

export type BackupPayload = {
  version: 2
  exportedAt: string
  settings: Settings
  categories: UserCategory[]
  months: MonthRecord[]
  lines: LineItem[]
  attachments: { monthId: string; mimeType: string; base64: string }[]
}
