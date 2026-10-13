export type LineType = 'in' | 'out' | 'adjust' | 'transfer'

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
  /** Year-month the opening balance applies before. Null counts every month. */
  openingAsOf: string | null
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
  remindersEnabled: boolean
  reminderLastFiredAt: number | null
  /** `${propertyId}:${yearMonth}` once the start-month sheet was dismissed or confirmed. */
  monthStartSeen: string | null
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
  standing?: boolean
  standingAmountCents?: number | null
  /** Money in or money out when this category repeats. Defaults to out. */
  standingType?: 'in' | 'out'
  /** Day of month (1–28) the standing amount is expected. */
  dueDay?: number | null
  /** Soft monthly cap for money-out categories. */
  budgetCents?: number | null
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
  /** Links the two sides of a property-to-property move. */
  transferGroupId?: string
  transferDirection?: 'in' | 'out'
  counterpartyPropertyId?: string
}

export type AttachmentRecord = {
  monthId: string
  blob: Blob
  mimeType: string
  updatedAt: number
}

export type BackupPayload = {
  version: 5
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
