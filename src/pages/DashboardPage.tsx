import { useState, useEffect } from 'react'
import { format, startOfWeek, addDays } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useFoodLog } from '@/hooks/useFoodLog'
import { getWeekSummary } from '@/services/calendarData'
import { DayCircle } from '@/components/calendar/DayCircle'

// ─── Macro ring ───────────────────────────────────────────────────────────────

function MacroRing({
  value,
  goal,
  color,
  label,
  unit = 'g',
}: {
  value: number
  goal: number
  color: string
  label: string
  unit?: string
}) {
  const pct = Math.min(1, goal > 0 ? value / goal : 0)
  const r = 24
  const circ = 2 * Math.PI * r
  const dash = pct * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} fill="none" stroke="#3f3f46" strokeWidth="5" />
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            className="transition-all duration-500"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-zinc-100">
          {Math.round(pct * 100)}%
        </span>
      </div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-xs text-zinc-500">
        {Math.round(value)}/{goal}{unit}
      </p>
    </div>
  )
}

// ─── Week strip ───────────────────────────────────────────────────────────────

const TODAY = format(new Date(), 'yyyy-MM-dd')
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function WeekStrip({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const [summaryMap, setSummaryMap] = useState<Record<string, { hasFood: boolean; hasWorkout: boolean; hasWeight: boolean }>>({})

  // Build Mon–Sun date array for the current week
  const weekDates = (() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), 'yyyy-MM-dd'))
  })()

  useEffect(() => {
    if (!userId) return
    getWeekSummary(userId, weekDates[0], weekDates[6])
      .then(summaries => {
        const map: Record<string, { hasFood: boolean; hasWorkout: boolean; hasWeight: boolean }> = {}
        for (const s of summaries) map[s.date] = { hasFood: s.hasFood, hasWorkout: s.hasWorkout, hasWeight: s.hasWeight }
        setSummaryMap(map)
      })
      .catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  function handleDayTap(date: string) {
    navigate('/calendar', { state: { date } })
  }

  return (
    <div className="bg-zinc-900 rounded-2xl px-3 py-3">
      <div className="grid grid-cols-7 gap-0">
        {weekDates.map((date, i) => {
          const summary = summaryMap[date]
          const isToday = date === TODAY
          const isPast = date < TODAY
          return (
            <div key={date} className="flex flex-col items-center gap-0.5">
              <span className={`text-xs font-medium ${isToday ? 'text-brand' : 'text-zinc-500'}`}>
                {DAY_LETTERS[i]}
              </span>
              <DayCircle
                date={date}
                hasFood={summary?.hasFood ?? false}
                hasWorkout={summary?.hasWorkout ?? false}
                hasWeight={summary?.hasWeight ?? false}
                isToday={isToday}
                isPast={isPast}
                size="sm"
                onClick={() => handleDayTap(date)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const today = format(new Date(), 'yyyy-MM-dd')
  const { dailyLog, loading } = useFoodLog(user?.id ?? '', today)

  const calorieGoal = profile?.calorie_goal ?? 2000
  const proteinGoal = profile?.protein_goal_g ?? 150
  const carbsGoal = profile?.carbs_goal_g ?? 250
  const fatGoal = profile?.fat_goal_g ?? 65

  const totals = dailyLog?.totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  const calPct = Math.min(100, Math.round((totals.calories / calorieGoal) * 100))
  const remaining = calorieGoal - totals.calories

  const displayName = profile?.name || user?.email?.split('@')[0] || 'there'

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Hey, {displayName} 👋</h1>
        <p className="text-sm text-zinc-500">{format(new Date(), 'EEEE, d MMMM')}</p>
      </div>

      {/* Week strip */}
      <WeekStrip userId={user?.id ?? ''} />

      {/* Calorie card */}
      <div
        className="bg-zinc-900 rounded-2xl p-4 cursor-pointer hover:bg-zinc-800/80 transition-colors"
        onClick={() => navigate('/food')}
      >
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Calories today</p>
        {loading ? (
          <div className="h-12 bg-zinc-800 rounded-lg animate-pulse" />
        ) : (
          <>
            <div className="flex items-end justify-between mb-3">
              <div>
                <span className="text-4xl font-bold text-zinc-100">{totals.calories}</span>
                <span className="text-zinc-500 text-sm ml-1">/ {calorieGoal} kcal</span>
              </div>
              <span className={`text-sm font-semibold ${remaining >= 0 ? 'text-brand' : 'text-red-400'}`}>
                {remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
              </span>
            </div>
            <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${calPct}%` }}
                className={`h-full rounded-full transition-all duration-500 ${calPct >= 100 ? 'bg-red-400' : 'bg-brand'}`}
              />
            </div>
          </>
        )}
      </div>

      {/* Macro rings */}
      <div
        className="bg-zinc-900 rounded-2xl p-4 cursor-pointer hover:bg-zinc-800/80 transition-colors"
        onClick={() => navigate('/nutrition')}
      >
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Macros</p>
        {loading ? (
          <div className="flex justify-around">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-16 h-20 bg-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex justify-around">
            <MacroRing value={totals.protein_g} goal={proteinGoal} color="#3b82f6" label="Protein" />
            <MacroRing value={totals.carbs_g} goal={carbsGoal} color="#facc15" label="Carbs" />
            <MacroRing value={totals.fat_g} goal={fatGoal} color="#f87171" label="Fat" />
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/food')}
          className="bg-zinc-900 hover:bg-zinc-800 rounded-2xl p-4 text-left transition-colors"
        >
          <p className="text-2xl mb-1">🍽️</p>
          <p className="text-sm font-medium text-zinc-100">Log food</p>
          <p className="text-xs text-zinc-500">Track your meals</p>
        </button>
        <button
          onClick={() => navigate('/workouts')}
          className="bg-zinc-900 hover:bg-zinc-800 rounded-2xl p-4 text-left transition-colors"
        >
          <p className="text-2xl mb-1">💪</p>
          <p className="text-sm font-medium text-zinc-100">Log workout</p>
          <p className="text-xs text-zinc-500">Start a session</p>
        </button>
      </div>
    </div>
  )
}
