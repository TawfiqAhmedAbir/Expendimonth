export type LineType = 'in' | 'out'

export type MonthStatus = 'empty' | 'open' | 'done'

export type Settings = {
  houseName: string
  currencyCode: string
  openingBalanceCents: number
  locale: string
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
  version: 1
  exportedAt: string
  settings: Settings
  months: MonthRecord[]
  lines: LineItem[]
  attachments: { monthId: string; mimeType: string; base64: string }[]
}
