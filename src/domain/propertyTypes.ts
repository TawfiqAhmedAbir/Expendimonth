import type { PropertyType, Settings } from './types'
import { t } from '../i18n'

export const PROPERTY_TYPE_OPTIONS: { id: PropertyType; labelKey: string }[] = [
  { id: 'house', labelKey: 'propertyType.house' },
  { id: 'land', labelKey: 'propertyType.land' },
  { id: 'vehicle', labelKey: 'propertyType.vehicle' },
  { id: 'business', labelKey: 'propertyType.business' },
  { id: 'other', labelKey: 'propertyType.other' },
]

export function propertyTypeLabel(settings: Settings, locale = 'en'): string {
  if (settings.propertyType === 'other' && settings.propertyTypeCustom.trim()) {
    return settings.propertyTypeCustom.trim()
  }
  const opt = PROPERTY_TYPE_OPTIONS.find((o) => o.id === settings.propertyType)
  return opt ? t(opt.labelKey, locale) : settings.propertyType
}
