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
  return LEGACY_LABELS[categoryId] ?? 'Unnamed'
}

/** Small curated icon set users can attach to a category (lucide names). */
export const CATEGORY_ICONS = [
  'wallet',
  'home',
  'zap',
  'droplets',
  'wrench',
  'car',
  'fuel',
  'shopping-bag',
  'users',
  'receipt',
  'hammer',
  'leaf',
] as const

export type CategoryIcon = (typeof CATEGORY_ICONS)[number]
