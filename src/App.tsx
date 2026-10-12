import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppDataProvider, useAppData } from './storage/AppDataContext'
import { ToastProvider } from './components/Toast'
import { isSetupComplete } from './storage/repository'
import { HomePage } from './pages/HomePage'
import { MonthPage } from './pages/MonthPage'
import { MonthsPage } from './pages/MonthsPage'
import { MorePage } from './pages/MorePage'
import { SetupPage } from './pages/SetupPage'

function AppRoutes() {
  const { ready } = useAppData()
  const setupDone = isSetupComplete()

  if (!ready) {
    return <div className="loading-screen">Loading…</div>
  }

  return (
    <Routes>
      <Route path="/setup" element={setupDone ? <Navigate to="/" replace /> : <SetupPage />} />
      <Route path="/" element={setupDone ? <HomePage /> : <Navigate to="/setup" replace />} />
      <Route
        path="/month/:yearMonth"
        element={setupDone ? <MonthPage /> : <Navigate to="/setup" replace />}
      />
      <Route path="/months" element={setupDone ? <MonthsPage /> : <Navigate to="/setup" replace />} />
      <Route path="/more" element={setupDone ? <MorePage /> : <Navigate to="/setup" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppDataProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AppDataProvider>
  )
}
