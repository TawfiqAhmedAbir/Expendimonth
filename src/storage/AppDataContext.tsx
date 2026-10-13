import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { BackupPayload, LineItem, MonthRecord, Property, Settings, UserCategory } from '../domain/types'
import { listCategories } from './categories'
import { listProperties } from './properties'
import { buildBackup, getLinesGrouped, listMonths, purgeAttachments, restoreBackup as writeBackup } from './repository'
import { loadSettings, patchSettings, saveSettings } from './settings'

type AppDataContextValue = {
  ready: boolean
  settings: Settings
  properties: Property[]
  activeProperty: Property | null
  categories: UserCategory[]
  months: MonthRecord[]
  monthsByYearMonth: Map<string, MonthRecord>
  linesByMonthId: Map<string, LineItem[]>
  refresh: () => Promise<void>
  updateSettings: (patch: Partial<Settings>) => void
  setActiveProperty: (id: string) => void
  exportBackup: () => Promise<void>
  shareBackup: () => Promise<void>
  restoreBackup: (payload: BackupPayload) => Promise<void>
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [properties, setProperties] = useState<Property[]>([])
  const [categories, setCategories] = useState<UserCategory[]>([])
  const [months, setMonths] = useState<MonthRecord[]>([])
  const [linesByMonthId, setLinesByMonthId] = useState<Map<string, LineItem[]>>(new Map())

  const refresh = useCallback(async () => {
    await purgeAttachments()
    const current = loadSettings()
    const props = await listProperties()
    let activeId = current.activePropertyId
    if ((!activeId || !props.some((p) => p.id === activeId)) && props.length > 0) {
      activeId = props[0]!.id
      saveSettings({ ...current, activePropertyId: activeId })
    }
    if (activeId) {
      const [m, lines, cats] = await Promise.all([
        listMonths(activeId),
        getLinesGrouped(activeId),
        listCategories(activeId),
      ])
      setMonths(m)
      setLinesByMonthId(lines)
      setCategories(cats)
    } else {
      setMonths([])
      setLinesByMonthId(new Map())
      setCategories([])
    }
    setProperties(props)
    setSettings(loadSettings())
    setReady(true)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', settings.theme === 'dark' ? '#15130f' : '#f6f2ec')
  }, [settings.theme])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...loadSettings(), ...patch }
    saveSettings(next)
    setSettings(next)
  }, [])

  const setActiveProperty = useCallback(
    (id: string) => {
      updateSettings({ activePropertyId: id })
      void refresh()
    },
    [refresh, updateSettings],
  )

  const makeBackupFile = useCallback(async () => {
    const payload = await buildBackup()
    const filename = `expendimonth-backup-${new Date().toISOString().slice(0, 10)}.json`
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    return { blob, filename }
  }, [])

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const markExported = useCallback(() => {
    patchSettings({ lastExportAt: Date.now() })
    setSettings(loadSettings())
  }, [])

  const exportBackup = useCallback(async () => {
    const { blob, filename } = await makeBackupFile()
    downloadBlob(blob, filename)
    markExported()
  }, [downloadBlob, makeBackupFile, markExported])

  const shareBackup = useCallback(async () => {
    const { blob, filename } = await makeBackupFile()
    const file = new File([blob], filename, { type: 'application/json' })
    const canShare = typeof navigator.share === 'function' && (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] }))
    if (canShare) {
      try {
        await navigator.share({ files: [file], title: filename })
        markExported()
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    downloadBlob(blob, filename)
    markExported()
  }, [downloadBlob, makeBackupFile, markExported])

  const restoreBackup = useCallback(async (payload: BackupPayload) => {
    await writeBackup(payload)
    await refresh()
  }, [refresh])

  const activeProperty = useMemo(
    () => properties.find((p) => p.id === settings.activePropertyId) ?? null,
    [properties, settings.activePropertyId],
  )

  const monthsByYearMonth = useMemo(() => {
    const map = new Map<string, MonthRecord>()
    for (const m of months) map.set(m.yearMonth, m)
    return map
  }, [months])

  const value = useMemo(
    () => ({
      ready,
      settings,
      properties,
      activeProperty,
      categories,
      months,
      monthsByYearMonth,
      linesByMonthId,
      refresh,
      updateSettings,
      setActiveProperty,
      exportBackup,
      shareBackup,
      restoreBackup,
    }),
    [
      ready,
      settings,
      properties,
      activeProperty,
      categories,
      months,
      monthsByYearMonth,
      linesByMonthId,
      refresh,
      updateSettings,
      setActiveProperty,
      exportBackup,
      shareBackup,
      restoreBackup,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData outside provider')
  return ctx
}

/** Active property, guaranteed by the route guard. */
export function useActiveProperty(): Property {
  const { activeProperty } = useAppData()
  if (!activeProperty) throw new Error('No active property')
  return activeProperty
}
