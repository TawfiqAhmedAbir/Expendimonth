import type { UserCategory } from './types'

const LEGACY_LABELS: Record<string, string> = {
  rent: 'Rent',
  electricity: 'Electricity',
  water: 'Water',
  maintenance: 'Maintenance',
  other: 'Other',
}

export function getCategoryLabel(categoryId: string, categories: UserCategory[]): string {
  const found = categories.find((c) => c.id === categoryId)
  if (found) return found.label
  return LEGACY_LABELS[categoryId] ?? categoryId
}
