import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  format, parseISO, getDaysInMonth, addMonths, subMonths, addDays, subDays,
  differenceInMinutes,
} from 'date-fns'
import { ChevronLeft, ChevronRight, ArrowLeft, Loader2, Plus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useCalendar } from '@/hooks/useCalendar'
import { DayCircle } from '@/components/calendar/DayCircle'
import { getFoodLogsForDate, buildDailyLog } from '@/services/foodLogs'
import { getSessionsForDate } from '@/services/workoutSessions'
import type { DailyLog, WorkoutSession, ExerciseSet, MealType } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = format(new Date(), 'yyyy-MM-dd')
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks']
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build the full 5-or-6-row grid for a month (Mon–Sun columns). */
function buildGridDays(year: number, month: number): { date: string; currentMonth: boolean }[] {
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = getDaysInMonth(firstDay)
  const lastDay = new Date(year, month - 1, daysInMonth)

  // Mon=0 … Sun=6
  const startDow = (firstDay.getDay() + 6) % 7
  const endDow = (lastDay.getDay() + 6) % 7

  const days: { date: string; currentMonth: boolean }[] = []

  // Leading days from previous month
  const prevMonthLastDay = new Date(year, month - 1, 0)
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(prevMonthLastDay)
    d.setDate(prevMonthLastDay.getDate() - i)
    days.push({ date: format(d, 'yyyy-MM-dd'), currentMonth: false })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: format(new Date(year, month - 1, d), 'yyyy-MM-dd'), currentMonth: true })
  }

  // Trailing days from next month
  const trailing = endDow === 6 ? 0 : 6 - endDow
  for (let d = 1; d <= trailing; d++) {
    days.push({ date: format(new Date(year, month, d), 'yyyy-MM-dd'), currentMonth: false })
  }

  return days
}

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) return '—'
  const mins = differenceInMinutes(parseISO(endedAt), parseISO(startedAt))
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

interface ExerciseRow {
  name: string
  bestSet: ExerciseSet | null
}

function groupExerciseSets(sets: ExerciseSet[] | undefined): ExerciseRow[] {
  const map = new Map<string, ExerciseSet[]>()
  for (const s of sets ?? []) {
    if (!s.completed) continue
    const existing = map.get(s.exercise_name) ?? []
    map.set(s.exercise_name, [...existing, s])
  }

  return Array.from(map.entries()).map(([name, setsForEx]) => {
    const withWeight = setsForEx.filter(s => s.weight_kg != null && s.weight_kg > 0)
    if (withWeight.length > 0) {
      const best = withWeight.reduce((a, b) => (a.weight_kg ?? 0) >= (b.weight_kg ?? 0) ? a : b)
      return { name, bestSet: best }
    }
    const withReps = setsForEx.filter(s => s.reps != null)
    if (withReps.length > 0) {
      const best = withReps.reduce((a, b) => (a.reps ?? 0) >= (b.reps ?? 0) ? a : b)
      return { name, bestSet: best }
    }
    return { name, bestSet: setsForEx[0] ?? null }
  })
}

function formatBestSet(set: ExerciseSet | null): string {
  if (!set) return '—'
  if (set.weight_kg != null && set.weight_kg > 0) {
    return `${set.weight_kg}kg × ${set.reps ?? '?'}`
  }
  if (set.reps != null) return `${set.reps} reps`
  return '—'
}

// ─── Day Detail ───────────────────────────────────────────────────────────────

function DayDetail({
  date,
  userId,
  calorieGoal,
  onBack,
  onPrev,
  onNext,
}: {
  date: string
  userId: string
  calorieGoal: number
  onBack: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const navigate = useNavigate()
  const canAddFood = date >= TODAY
  const [loading, setLoading] = useState(true)
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null)
  const [sessions, setSessions] = useState<WorkoutSession[]>([])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)

    Promise.all([
      getFoodLogsForDate(userId, date),
      getSessionsForDate(userId, date),
    ])
      .then(([logs, sess]) => {
        if (cancelled) return
        setDailyLog(buildDailyLog(date, logs))
        setSessions(sess)
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [userId, date])

  const headingDate = format(parseISO(date), 'EEEE d MMMM yyyy')

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center px-2 py-3 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
        <button
          onClick={onBack}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
          aria-label="Back to calendar"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-1 items-center justify-between px-1">
          <button
            onClick={onPrev}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-sm font-semibold text-zinc-100">{headingDate}</h2>
          <button
            onClick={onNext}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
            aria-label="Next day"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-zinc-600" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-8 space-y-4 pt-4">

          {/* ── Food section ───────────────────────────────────────────── */}
          <section className="mx-4 bg-zinc-900 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-100">Food</h3>
              <div className="flex items-center gap-3">
                {dailyLog && (
                  <span className="text-xs text-zinc-500">
                    <span className={dailyLog.totals.calories > calorieGoal ? 'text-red-400' : 'text-brand'}>
                      {dailyLog.totals.calories}
                    </span>
                    {' '}/ {calorieGoal} kcal
                  </span>
                )}
                {canAddFood && (
                  <button
                    onClick={() => navigate('/food', { state: { date } })}
                    className="flex items-center gap-1 text-sm font-medium text-brand hover:text-green-400 transition-colors"
                  >
                    <Plus size={15} />
                    Add
                  </button>
                )}
              </div>
            </div>

            {dailyLog && MEAL_ORDER.every(m => dailyLog.meals[m].length === 0) ? (
              <p className="text-sm text-zinc-600 italic">Nothing logged</p>
            ) : (
              MEAL_ORDER.map(meal => {
                const items = dailyLog?.meals[meal] ?? []
                if (items.length === 0) return null
                return (
                  <div key={meal}>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">
                      {MEAL_LABELS[meal]}
                    </p>
                    <ul className="space-y-1">
                      {items.map(item => (
                        <li key={item.id} className="flex items-center justify-between gap-2">
                          <span className="text-sm text-zinc-200 truncate flex-1">
                            {item.food_name}
                            {item.quantity !== 1 && (
                              <span className="text-zinc-500"> ×{item.quantity}</span>
                            )}
                          </span>
                          <span className="text-xs text-zinc-500 shrink-0">
                            {Math.round(item.calories * item.quantity)} kcal
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })
            )}
          </section>

          {/* ── Workout section ─────────────────────────────────────────── */}
          <section className="mx-4 bg-zinc-900 rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-zinc-100">Workout</h3>

            {sessions.length === 0 ? (
              <p className="text-sm text-zinc-600 italic">No workout logged</p>
            ) : (
              sessions.map(session => {
                const exerciseRows = groupExerciseSets(session.sets)
                return (
                  <div key={session.id}>
                    <div className="flex items-baseline justify-between mb-2">
                      <p className="text-sm font-medium text-zinc-100">
                        {session.name ?? 'Workout'}
                      </p>
                      <span className="text-xs text-zinc-500">
                        {formatDuration(session.started_at, session.ended_at)}
                      </span>
                    </div>

                    {exerciseRows.length === 0 ? (
                      <p className="text-xs text-zinc-600 italic">No sets completed</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {exerciseRows.map(row => (
                          <li key={row.name} className="flex items-center justify-between gap-2">
                            <span className="text-sm text-zinc-200 truncate flex-1">
                              {row.name}
                            </span>
                            <span className="text-xs text-zinc-500 shrink-0">
                              {formatBestSet(row.bestSet)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })
            )}
          </section>

        </div>
      )}
    </div>
  )
}

// ─── Calendar Grid ────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { user, profile } = useAuthStore()
  const location = useLocation()

  // Support navigation from the dashboard week strip via location state
  const preselectedDate = (location.state as { date?: string } | null)?.date ?? null

  const [selectedDate, setSelectedDate] = useState<string | null>(preselectedDate)

  const [year, setYear] = useState(() =>
    preselectedDate ? parseInt(preselectedDate.slice(0, 4)) : new Date().getFullYear(),
  )
  const [month, setMonth] = useState(() =>
    preselectedDate ? parseInt(preselectedDate.slice(5, 7)) : new Date().getMonth() + 1,
  )

  const { summaryMap, loading } = useCalendar(user?.id ?? '', year, month)

  const gridDays = useMemo(() => buildGridDays(year, month), [year, month])

  function prevMonth() {
    const d = subMonths(new Date(year, month - 1, 1), 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
  }
  function nextMonth() {
    const d = addMonths(new Date(year, month - 1, 1), 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
  }

  // When user closes a day detail, keep calendar at the month of that date
  function handleBack() {
    setSelectedDate(null)
  }

  if (selectedDate) {
    return (
      <DayDetail
        date={selectedDate}
        userId={user?.id ?? ''}
        calorieGoal={profile?.calorie_goal ?? 2000}
        onBack={handleBack}
        onPrev={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
        onNext={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
      />
    )
  }

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy')

  return (
    <div className="pb-6">
      {/* ── Month navigation ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <button
          onClick={prevMonth}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-sm font-semibold text-zinc-100">{monthLabel}</h2>
        <button
          onClick={nextMonth}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ── Day-of-week labels ────────────────────────────────────────── */}
      <div className="grid grid-cols-7 px-2 pt-3 pb-1">
        {DAY_LETTERS.map((l, i) => (
          <div key={i} className="flex justify-center">
            <span className="text-xs font-medium text-zinc-500">{l}</span>
          </div>
        ))}
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin text-zinc-600" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-y-1 px-2">
          {gridDays.map(({ date, currentMonth }) => {
            const dayNum = parseInt(date.slice(8, 10))
            const summary = summaryMap[date]
            const isToday = date === TODAY
            const isPast = date < TODAY

            return (
              <div
                key={date}
                className={`flex flex-col items-center gap-0.5 py-1 transition-opacity ${
                  currentMonth ? '' : 'opacity-25 pointer-events-none'
                }`}
              >
                <span
                  className={`text-xs leading-none mb-0.5 ${
                    isToday ? 'text-brand font-semibold' : 'text-zinc-500'
                  }`}
                >
                  {dayNum}
                </span>
                <DayCircle
                  date={date}
                  hasFood={summary?.hasFood ?? false}
                  hasWorkout={summary?.hasWorkout ?? false}
                  hasWeight={summary?.hasWeight ?? false}
                  isToday={isToday}
                  isPast={isPast}
                  size="md"
                  onClick={currentMonth ? () => setSelectedDate(date) : undefined}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
