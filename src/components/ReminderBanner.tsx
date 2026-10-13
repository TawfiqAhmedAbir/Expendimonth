import { Button } from '../design-kit/Primitives'

type Props = {
  text: string
  onDismiss: () => void
}

export function ReminderBanner({ text, onDismiss }: Props) {
  return (
    <div className="insight insight--warn row row--between" style={{ marginBottom: 'var(--s-4)' }}>
      <span>{text}</span>
      <Button size="sm" variant="subtle" onClick={onDismiss}>
        OK
      </Button>
    </div>
  )
}
