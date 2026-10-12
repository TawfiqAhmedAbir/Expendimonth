import type { UserCategory } from '../domain/types'
import { getDb } from './db'

export async function listCategories(propertyId: string): Promise<UserCategory[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('categories', 'by-propertyId', propertyId)
  return all.sort((a, b) => b.useCount - a.useCount || b.lastUsedAt - a.lastUsedAt)
}

export async function createCategory(propertyId: string, label: string): Promise<UserCategory> {
  const trimmed = label.trim()
  if (!trimmed) throw new Error('Category label required')
  const db = await getDb()
  const existing = (await db.getAllFromIndex('categories', 'by-propertyId', propertyId)).find(
    (c) => c.label.toLowerCase() === trimmed.toLowerCase(),
  )
  if (existing) return existing
  const now = Date.now()
  const category: UserCategory = {
    id: crypto.randomUUID(),
    propertyId,
    label: trimmed,
    icon: null,
    createdAt: now,
    lastUsedAt: now,
    lastAmountCents: null,
    useCount: 0,
  }
  await db.put('categories', category)
  return category
}

export async function updateCategory(id: string, patch: Partial<Pick<UserCategory, 'label' | 'icon'>>): Promise<void> {
  const db = await getDb()
  const cat = await db.get('categories', id)
  if (!cat) return
  const label = patch.label !== undefined ? patch.label.trim() : cat.label
  if (!label) return
  await db.put('categories', { ...cat, ...patch, label })
}

/** Records a use: bumps count, timestamp and the last amount entered. */
export async function touchCategory(id: string, amountCents?: number): Promise<void> {
  const db = await getDb()
  const cat = await db.get('categories', id)
  if (!cat) return
  await db.put('categories', {
    ...cat,
    lastUsedAt: Date.now(),
    useCount: cat.useCount + 1,
    lastAmountCents: amountCents ?? cat.lastAmountCents,
  })
}

export async function deleteCategory(id: string): Promise<UserCategory | undefined> {
  const db = await getDb()
  const cat = await db.get('categories', id)
  if (!cat) return undefined
  await db.delete('categories', id)
  return cat
}

export async function restoreCategory(cat: UserCategory): Promise<void> {
  const db = await getDb()
  await db.put('categories', cat)
}
