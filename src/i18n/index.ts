import en from './en.json'

type Dict = Record<string, string>

const catalogs: Record<string, Dict> = { en: en as Dict }

export function t(key: string, locale = 'en', vars?: Record<string, string>): string {
  const dict = catalogs[locale] ?? catalogs.en!
  let text = dict[key] ?? catalogs.en![key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v)
    }
  }
  return text
}

export function setLocale(_locale: string): void {
  /* stub for future fr catalog merge */
}
