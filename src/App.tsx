import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { Skeleton } from './design-kit/Primitives'
import { CategoriesPage } from './pages/CategoriesPage'
import { HomePage } from './pages/HomePage'
import { InsightsPage } from './pages/InsightsPage'
import { LockPage } from './pages/LockPage'
import { MonthPage } from './pages/MonthPage'
import { MonthsPage } from './pages/MonthsPage'
import { MorePage } from './pages/MorePage'
import { PortfolioPage } from './pages/PortfolioPage'
import { NewPropertyPage, PropertiesPage } from './pages/PropertiesPage'
import { ReportPage } from './pages/ReportPage'
import { SetupPage } from './pages/SetupPage'
import { YearSummaryPage } from './pages/YearSummaryPage'
import { installAutoLock, isUnlocked } from './security/pin'
import { AppDataProvider, useAppData } from './storage/AppDataContext'

function LoadingScreen() {
  return (
    <div className="shell">
      <div className="shell__main stack">
        <Skeleton height="2rem" width="60%" />
        <Skeleton height="16rem" />
        <Skeleton height="3rem" />
        <Skeleton height="6rem" />
      </div>
    </div>
  )
}

function PinGate({ children }: { children: ReactNode }) {
  const { settings } = useAppData()
  const [unlocked, setUnlocked] = useState(() => isUnlocked())
  useEffect(() => installAutoLock(() => setUnlocked(false)), [])
  if (settings.pinHash && !unlocked) return <LockPage onUnlock={() => setUnlocked(true)} />
  return <>{children}</>
}

function AppRoutes() {
  const { ready, settings, activeProperty } = useAppData()
  if (!ready) return <LoadingScreen />

  const setupDone = Boolean(settings.userName.trim() && activeProperty)
  const guard = (el: ReactNode) => (setupDone ? el : <Navigate to="/setup" replace />)

  return (
    <Routes>
      <Route path="/setup" element={setupDone ? <Navigate to="/" replace /> : <SetupPage />} />
      <Route path="/" element={guard(<HomePage />)} />
      <Route path="/month/:yearMonth" element={guard(<MonthPage />)} />
      <Route path="/months" element={guard(<MonthsPage />)} />
      <Route path="/year/:year" element={guard(<YearSummaryPage />)} />
      <Route path="/insights" element={guard(<InsightsPage />)} />
      <Route path="/portfolio" element={guard(<PortfolioPage />)} />
      <Route path="/report/:scope/:id" element={guard(<ReportPage />)} />
      <Route path="/more" element={guard(<MorePage />)} />
      <Route path="/categories" element={guard(<CategoriesPage />)} />
      <Route path="/properties" element={guard(<PropertiesPage />)} />
      <Route path="/properties/new" element={settings.userName.trim() ? <NewPropertyPage /> : <Navigate to="/setup" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppDataProvider>
      <ToastProvider>
        <BrowserRouter>
          <PinGate>
            <AppRoutes />
          </PinGate>
        </BrowserRouter>
      </ToastProvider>
    </AppDataProvider>
  )
}
