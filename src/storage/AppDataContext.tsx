import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { LineItem, MonthRecord, Settings, UserCategory } from '../domain/types'
import { listCategories } from './categories'
import {
  buildBackup,
  getAllLinesGrouped,
  listMonths,
  loadSettings,
  saveSettings,
} from './repository'

type AppDataContextValue = {
  ready: boolean
  settings: Settings
  categories: UserCategory[]
  months: MonthRecord[]
  linesByMonthId: Map<string, LineItem[]>
  refresh: () => Promise<void>
  updateSettings: (s: Settings) => void
  exportBackup: () => Promise<void>
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [categories, setCategories] = useState<UserCategory[]>([])
  const [months, setMonths] = useState<MonthRecord[]>([])
  const [linesByMonthId, setLinesByMonthId] = useState<Map<string, LineItem[]>>(new Map())

  const refresh = useCallback(async () => {
    const [m, lines, cats] = await Promise.all([
      listMonths(),
      getAllLinesGrouped(),
      listCategories(),
    ])
    setMonths(m)
    setLinesByMonthId(lines)
    setCategories(cats)
    setSettings(loadSettings())
    setReady(true)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const updateSettings = useCallback((s: Settings) => {
    saveSettings(s)
    setSettings(s)
  }, [])

  const exportBackup = useCallback(async () => {
    const payload = await buildBackup()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expendimonth-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const value = useMemo(
    () => ({
      ready,
      settings,
      categories,
      months,
      linesByMonthId,
      refresh,
      updateSettings,
      exportBackup,
    }),
    [ready, settings, categories, months, linesByMonthId, refresh, updateSettings, exportBackup],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData outside provider')
  return ctx
}
