import { useParams } from 'react-router-dom'
import { ScreenShell } from '../design-kit/ScreenShell'
import { MonthView } from '../components/MonthView'

export function MonthPage() {
  const { yearMonth } = useParams()
  if (!yearMonth) return null

  return (
    <ScreenShell>
      <MonthView yearMonth={yearMonth} />
    </ScreenShell>
  )
}
