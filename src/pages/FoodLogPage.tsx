import { useState } from 'react'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useFoodLog } from '@/hooks/useFoodLog'
import { useAuthStore } from '@/store/authStore'
import DailySummaryCard from '@/components/food/DailySummaryCard'
import FoodSearchModal from '@/components/food/FoodSearchModal'
import type { MealType } from '@/types'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks']

function toDateString(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

export default function FoodLogPage() {
  const { user, profile } = useAuthStore()
  const location = useLocation()
  const initialDate = (location.state as { date?: string } | null)?.date
  const [currentDate, setCurrentDate] = useState(() =>
    initialDate ? parseISO(initialDate) : new Date(),
  )
  const [modalMeal, setModalMeal] = useState<MealType | null>(null)

  const dateStr = toDateString(currentDate)
  const { dailyLog, loading, error, addEntry, removeEntry } = useFoodLog(
    user?.id ?? '',
    dateStr,
  )

  const totals = dailyLog?.totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }

  const todayStr = toDateString(new Date())
  const isToday = dateStr === todayStr
  const isTomorrow = dateStr === toDateString(addDays(new Date(), 1))
  const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(currentDate, 'EEE, d MMM')

  return (
    <div className="pb-6">
      {/* ── Date navigation ── */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800/50">
        <button
          onClick={() => setCurrentDate(d => subDays(d, 1))}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          onClick={() => setCurrentDate(new Date())}
          className="text-sm font-medium text-zinc-100 hover:text-brand transition-colors"
        >
          {dateLabel}
        </button>

        <button
          onClick={() => setCurrentDate(d => addDays(d, 1))}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
          aria-label="Next day"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ── Daily summary card ── */}
      <div className="mx-4 mt-4">
        <DailySummaryCard
          totals={totals}
          userId={user?.id ?? ''}
          date={dateStr}
          profile={profile}
        />
      </div>

      {/* ── Error banner ── */}
      {error && (
        <p className="mx-4 mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* ── Meal sections ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-zinc-600" />
        </div>
      ) : (
        <div className="mt-4 space-y-3 px-4">
          {MEAL_ORDER.map(meal => {
            const items = dailyLog?.meals[meal] ?? []
            const mealCals = items.reduce((sum, item) => sum + item.calories, 0)

            return (
              <div key={meal} className="bg-zinc-900 rounded-2xl overflow-hidden">
                {/* Meal header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-100">{MEAL_LABELS[meal]}</span>
                    {mealCals > 0 && (
                      <span className="text-xs text-zinc-500">{mealCals} kcal</span>
                    )}
                  </div>
                  <button
                    onClick={() => setModalMeal(meal)}
                    className="flex items-center gap-1 text-sm font-medium text-brand hover:text-green-400 transition-colors"
                  >
                    <Plus size={15} />
                    Add
                  </button>
                </div>

                {/* Food items */}
                {items.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-zinc-600 italic">Nothing logged</p>
                ) : (
                  <ul className="divide-y divide-zinc-800/40">
                    {items.map(item => (
                      <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-100 truncate">{item.food_name}</p>
                          {item.brand && (
                            <p className="text-xs text-zinc-500 truncate">{item.brand}</p>
                          )}
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {Math.round(item.quantity * 100)}g
                            {' · '}
                            <span className="text-zinc-300">{item.calories} kcal</span>
                            {' · '}P {Math.round(item.protein_g)}g
                            {' · '}C {Math.round(item.carbs_g)}g
                            {' · '}F {Math.round(item.fat_g)}g
                          </p>
                        </div>
                        <button
                          onClick={() => removeEntry(item.id)}
                          className="shrink-0 p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                          aria-label={`Delete ${item.food_name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Food search modal ── */}
      {modalMeal && user && (
        <FoodSearchModal
          mealType={modalMeal}
          mealLabel={MEAL_LABELS[modalMeal]}
          userId={user.id}
          date={dateStr}
          onAdd={addEntry}
          onClose={() => setModalMeal(null)}
        />
      )}
    </div>
  )
}
