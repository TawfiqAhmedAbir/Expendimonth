export type Category = {
  id: string
  labelKey: string
  defaultType: 'in' | 'out' | 'both'
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'rent', labelKey: 'category.rent', defaultType: 'in' },
  { id: 'electricity', labelKey: 'category.electricity', defaultType: 'out' },
  { id: 'water', labelKey: 'category.water', defaultType: 'out' },
  { id: 'maintenance', labelKey: 'category.maintenance', defaultType: 'out' },
  { id: 'other', labelKey: 'category.other', defaultType: 'both' },
]

export function getCategoryLabelKey(categoryId: string): string {
  return DEFAULT_CATEGORIES.find((c) => c.id === categoryId)?.labelKey ?? 'category.other'
}
