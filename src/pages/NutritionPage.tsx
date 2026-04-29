import { useMemo } from 'react'
import { format } from 'date-fns'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useFoodLog } from '@/hooks/useFoodLog'
import type { FoodLog, MealType } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = format(new Date(), 'yyyy-MM-dd')
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks']
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
}

// ─── Types & helpers ──────────────────────────────────────────────────────────

interface FullTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fibre_g: number
  sugar_g: number
  salt_g: number
}

function sumLogs(logs: FoodLog[]): FullTotals {
  return logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein_g: acc.protein_g + l.protein_g,
      carbs_g: acc.carbs_g + l.carbs_g,
      fat_g: acc.fat_g + l.fat_g,
      fibre_g: acc.fibre_g + l.fibre_g,
      sugar_g: acc.sugar_g + l.sugar_g,
      salt_g: acc.salt_g + l.salt_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sugar_g: 0, salt_g: 0 },
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MacroBar({
  label,
  value,
  goal,
  color,
  note,
}: {
  label: string
  value: number
  goal: number
  color: string
  note?: string
}) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0
  const over = value > goal

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-sm font-medium text-zinc-200">{label}</span>
          {note && <span className="text-xs text-zinc-600 ml-1.5">{note}</span>}
        </div>
        <span className={`text-sm tabular-nums ${over ? 'text-red-400' : 'text-zinc-400'}`}>
          {Math.round(value)}g
          <span className="text-zinc-600"> / {goal}g</span>
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          style={{ width: `${pct}%` }}
          className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-400' : color}`}
        />
      </div>
      <p className={`text-xs text-right ${over ? 'text-red-400' : 'text-zinc-600'}`}>
        {over
          ? `${Math.round(value - goal)}g over`
          : `${Math.round(goal - value)}g remaining`}
      </p>
    </div>
  )
}

function NutrientRow({
  label,
  value,
  unit = 'g',
  indent = false,
  highlight = false,
}: {
  label: string
  value: number
  unit?: string
  indent?: boolean
  highlight?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-zinc-800/50 last:border-0 ${indent ? 'pl-4' : ''}`}>
      <span className={`text-sm ${indent ? 'text-zinc-500' : 'text-zinc-300'}`}>{label}</span>
      <span className={`text-sm tabular-nums font-medium ${highlight ? 'text-zinc-100' : 'text-zinc-400'}`}>
        {value < 0.1 && value > 0 ? '<0.1' : value.toFixed(1)}{unit}
      </span>
    </div>
  )
}

function MealSummaryRow({
  label,
  logs,
}: {
  label: string
  logs: FoodLog[]
}) {
  if (logs.length === 0) return null
  const t = sumLogs(logs)
  return (
    <div className="py-3 border-b border-zinc-800/50 last:border-0">
      <div className="flex items-baseline justify-between mb-0.5">
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        <span className="text-sm tabular-nums text-zinc-300">{Math.round(t.calories)} kcal</span>
      </div>
      <p className="text-xs text-zinc-500">
        P {Math.round(t.protein_g)}g
        {' · '}C {Math.round(t.carbs_g)}g
        {' · '}F {Math.round(t.fat_g)}g
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NutritionPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const { dailyLog, loading } = useFoodLog(user?.id ?? '', TODAY)

  const calorieGoal = profile?.calorie_goal ?? 2000
  const proteinGoal = profile?.protein_goal_g ?? 150
  const carbsGoal = profile?.carbs_goal_g ?? 250
  const fatGoal = profile?.fat_goal_g ?? 65

  const allLogs = useMemo(
    () => MEAL_ORDER.flatMap(m => dailyLog?.meals[m] ?? []),
    [dailyLog],
  )

  const totals = useMemo(() => sumLogs(allLogs), [allLogs])

  const calPct = Math.min(100, calorieGoal > 0 ? (totals.calories / calorieGoal) * 100 : 0)
  const calOver = totals.calories > calorieGoal
  const calDelta = Math.abs(calorieGoal - totals.calories)

  return (
    <div className="pb-8">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-2 py-3 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800/50">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-zinc-100 leading-tight">Nutrition</h1>
          <p className="text-xs text-zinc-500">{format(new Date(), 'EEEE d MMMM')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-zinc-600" />
        </div>
      ) : (
        <div className="space-y-4 pt-4 px-4">

          {/* ── Calories ── */}
          <div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Calories</p>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-4xl font-bold text-zinc-100">{Math.round(totals.calories)}</span>
                <span className="text-sm text-zinc-500 ml-1.5">/ {calorieGoal} kcal</span>
              </div>
              <span className={`text-sm font-semibold ${calOver ? 'text-red-400' : 'text-brand'}`}>
                {calOver ? `${calDelta} over` : `${calDelta} left`}
              </span>
            </div>
            <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${calPct}%` }}
                className={`h-full rounded-full transition-all duration-500 ${calOver ? 'bg-red-400' : 'bg-brand'}`}
              />
            </div>
          </div>

          {/* ── Macronutrients ── */}
          <div className="bg-zinc-900 rounded-2xl p-4 space-y-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Macronutrients</p>
            <MacroBar
              label="Protein"
              value={totals.protein_g}
              goal={proteinGoal}
              color="bg-blue-400"
            />
            <MacroBar
              label="Carbohydrates"
              value={totals.carbs_g}
              goal={carbsGoal}
              color="bg-yellow-400"
            />
            <MacroBar
              label="Fat"
              value={totals.fat_g}
              goal={fatGoal}
              color="bg-red-400"
            />
          </div>

          {/* ── Detailed nutrients ── */}
          <div className="bg-zinc-900 rounded-2xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Other Nutrients</p>
            <NutrientRow label="Fibre" value={totals.fibre_g} highlight />
            <NutrientRow
              label="of which sugars"
              value={totals.sugar_g}
              indent
            />
            <NutrientRow label="Salt" value={totals.salt_g} highlight />
            <div className="pt-3 mt-1">
              <p className="text-xs text-zinc-600 italic">
                Vitamins and minerals aren't tracked yet — they depend on richer nutritional data from the food database.
              </p>
            </div>
          </div>

          {/* ── By meal ── */}
          <div className="bg-zinc-900 rounded-2xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">By Meal</p>
            {MEAL_ORDER.every(m => (dailyLog?.meals[m] ?? []).length === 0) ? (
              <p className="text-sm text-zinc-600 italic py-3">No food logged today</p>
            ) : (
              MEAL_ORDER.map(m => (
                <MealSummaryRow
                  key={m}
                  label={MEAL_LABELS[m]}
                  logs={dailyLog?.meals[m] ?? []}
                />
              ))
            )}
          </div>

        </div>
      )}
    </div>
  )
}
