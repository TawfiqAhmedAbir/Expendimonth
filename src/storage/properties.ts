import type { Property, PropertySnapshot } from '../domain/types'
import { getDb } from './db'

export const PROPERTY_COLORS = ['#1f4f5e', '#2b6b4f', '#b7791f', '#7a4e8c', '#c2553f', '#3b6fb6']

export async function listProperties(): Promise<Property[]> {
  const db = await getDb()
  const all = await db.getAll('properties')
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function getProperty(id: string): Promise<Property | undefined> {
  const db = await getDb()
  return db.get('properties', id)
}

export async function createProperty(input: Omit<Property, 'id' | 'createdAt' | 'color'> & { color?: string }): Promise<Property> {
  const db = await getDb()
  const existing = await db.count('properties')
  const property: Property = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    color: input.color ?? PROPERTY_COLORS[existing % PROPERTY_COLORS.length]!,
    ...input,
  }
  await db.put('properties', property)
  return property
}

export async function updateProperty(id: string, patch: Partial<Omit<Property, 'id' | 'createdAt'>>): Promise<void> {
  const db = await getDb()
  const p = await db.get('properties', id)
  if (!p) return
  await db.put('properties', { ...p, ...patch })
}

/** Deletes a property and everything under it; returns a snapshot for undo. */
export async function deleteProperty(id: string): Promise<PropertySnapshot | null> {
  const db = await getDb()
  const property = await db.get('properties', id)
  if (!property) return null
  const months = await db.getAllFromIndex('months', 'by-propertyId', id)
  const categories = await db.getAllFromIndex('categories', 'by-propertyId', id)
  const lines = (
    await Promise.all(months.map((m) => db.getAllFromIndex('lines', 'by-monthId', m.id)))
  ).flat()
  const attachments = (
    await Promise.all(months.map((m) => db.get('attachments', m.id)))
  ).filter((a): a is NonNullable<typeof a> => Boolean(a))

  const tx = db.transaction(['properties', 'months', 'lines', 'attachments', 'categories'], 'readwrite')
  await Promise.all([
    tx.objectStore('properties').delete(id),
    ...months.map((m) => tx.objectStore('months').delete(m.id)),
    ...lines.map((l) => tx.objectStore('lines').delete(l.id)),
    ...attachments.map((a) => tx.objectStore('attachments').delete(a.monthId)),
    ...categories.map((c) => tx.objectStore('categories').delete(c.id)),
  ])
  await tx.done
  return { property, months, lines, categories, attachments }
}

export async function restoreProperty(snapshot: PropertySnapshot): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['properties', 'months', 'lines', 'attachments', 'categories'], 'readwrite')
  await Promise.all([
    tx.objectStore('properties').put(snapshot.property),
    ...snapshot.months.map((m) => tx.objectStore('months').put(m)),
    ...snapshot.lines.map((l) => tx.objectStore('lines').put(l)),
    ...snapshot.attachments.map((a) => tx.objectStore('attachments').put(a)),
    ...snapshot.categories.map((c) => tx.objectStore('categories').put(c)),
  ])
  await tx.done
}
