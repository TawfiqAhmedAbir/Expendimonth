import type { Property, PropertyType } from './types'
import { t } from '../i18n'

export const PROPERTY_TYPE_OPTIONS: { id: PropertyType; labelKey: string }[] = [
  { id: 'house', labelKey: 'propertyType.house' },
  { id: 'land', labelKey: 'propertyType.land' },
  { id: 'vehicle', labelKey: 'propertyType.vehicle' },
  { id: 'business', labelKey: 'propertyType.business' },
  { id: 'other', labelKey: 'propertyType.other' },
]

export function propertyTypeLabel(
  p: Pick<Property, 'type' | 'typeCustom'>,
  locale = 'en',
): string {
  if (p.type === 'other' && p.typeCustom.trim()) return p.typeCustom.trim()
  const opt = PROPERTY_TYPE_OPTIONS.find((o) => o.id === p.type)
  return opt ? t(opt.labelKey, locale) : p.type
}

export const CURRENCIES = [
  { code: 'BDT', label: 'Bangladeshi taka (BDT)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British pound (GBP)' },
  { code: 'INR', label: 'Indian rupee (INR)' },
  { code: 'MAD', label: 'Moroccan dirham (MAD)' },
  { code: 'USD', label: 'US dollar (USD)' },
]
