import { Check } from 'lucide-react'

interface DayCircleProps {
  date: string
  hasFood: boolean
  hasWorkout: boolean
  hasWeight: boolean
  isToday: boolean
  isPast: boolean
  size?: 'sm' | 'md'
  onClick?: () => void
}

/**
 * The shared circle indicator used in both the full calendar and the dashboard
 * week strip. Renders the circle + activity dots; does NOT render the day number.
 *
 * Visual states:
 *   hasFood    → solid brand-green circle, dark checkmark inside
 *   isToday    → dark fill, dashed brand-green border
 *   other      → transparent, muted grey border
 *
 * Activity dots (shown side by side below the circle):
 *   hasWorkout → green dot (left)
 *   hasWeight  → blue dot (right)
 * Invisible placeholders keep layout stable when dots are absent.
 */
export function DayCircle({
  hasFood,
  hasWorkout,
  hasWeight,
  isToday,
  size = 'md',
  onClick,
}: DayCircleProps) {
  const sizeClass = size === 'sm' ? 'w-9 h-9' : 'w-10 h-10'
  const checkSize = size === 'sm' ? 13 : 15

  const circleClass = hasFood
    ? 'bg-brand border-2 border-brand'
    : isToday
      ? 'bg-zinc-900 border-2 border-dashed border-brand'
      : 'border-2 border-zinc-600'

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      {...(onClick ? { onClick, type: 'button' } : {})}
      className="flex flex-col items-center gap-1"
    >
      {/* Main circle */}
      <div className={`${sizeClass} rounded-full flex items-center justify-center transition-all ${circleClass}`}>
        {hasFood && (
          <Check size={checkSize} strokeWidth={2.5} className="text-zinc-900" />
        )}
      </div>

      {/* Activity dots row — placeholders keep height constant */}
      <div className="flex items-center gap-1">
        <div className={`w-1.5 h-1.5 rounded-full transition-all ${hasWorkout ? 'bg-brand' : 'opacity-0'}`} />
        <div className={`w-1.5 h-1.5 rounded-full transition-all ${hasWeight ? 'bg-blue-400' : 'opacity-0'}`} />
      </div>
    </Wrapper>
  )
}
