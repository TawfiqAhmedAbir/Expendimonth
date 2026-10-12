import type { UserCategory } from '../domain/types'
import { getDb } from './db'

export async function listCategories(): Promise<UserCategory[]> {
  const db = await getDb()
  const all = await db.getAll('categories')
  return all.sort((a, b) => b.lastUsedAt - a.lastUsedAt)
}

export async function createCategory(label: string): Promise<UserCategory> {
  const trimmed = label.trim()
  if (!trimmed) throw new Error('Category label required')
  const db = await getDb()
  const existing = (await db.getAll('categories')).find(
    (c) => c.label.toLowerCase() === trimmed.toLowerCase(),
  )
  if (existing) {
    await touchCategory(existing.id)
    return { ...existing, lastUsedAt: Date.now() }
  }
  const now = Date.now()
  const category: UserCategory = {
    id: crypto.randomUUID(),
    label: trimmed,
    createdAt: now,
    lastUsedAt: now,
  }
  await db.put('categories', category)
  return category
}

export async function updateCategoryLabel(id: string, label: string): Promise<void> {
  const trimmed = label.trim()
  if (!trimmed) return
  const db = await getDb()
  const cat = await db.get('categories', id)
  if (!cat) return
  await db.put('categories', { ...cat, label: trimmed })
}

export async function touchCategory(id: string): Promise<void> {
  const db = await getDb()
  const cat = await db.get('categories', id)
  if (!cat) return
  await db.put('categories', { ...cat, lastUsedAt: Date.now() })
}
