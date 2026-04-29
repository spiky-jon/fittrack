import { useState, useEffect } from 'react'
import { Pencil, X, RotateCcw, Check, Loader2 } from 'lucide-react'
import { useDailyGoals } from '@/hooks/useDailyGoals'
import type { DailyNutrition, Profile } from '@/types'
import type { DailyGoals } from '@/services/dailyGoals'

interface Props {
  totals: DailyNutrition
  userId: string
  date: string
  profile: Profile | null
}

function MacroBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein * 4 + carbs * 4 + fat * 9
  if (total === 0) return <div className="h-2 rounded-full bg-zinc-800" />
  const pPct = Math.round((protein * 4 / total) * 100)
  const cPct = Math.round((carbs * 4 / total) * 100)
  const fPct = 100 - pPct - cPct
  return (
    <div className="h-2 rounded-full overflow-hidden flex">
      <div style={{ width: `${pPct}%` }} className="bg-blue-500" />
      <div style={{ width: `${cPct}%` }} className="bg-yellow-400" />
      <div style={{ width: `${fPct}%` }} className="bg-red-400" />
    </div>
  )
}

export default function DailySummaryCard({ totals, userId, date, profile }: Props) {
  const { goals, isOverride, loading: goalsLoading, saveGoals, resetGoals } = useDailyGoals(
    userId,
    date,
    profile,
  )

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DailyGoals>(goals)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Keep draft in sync if goals change externally (e.g. date navigation)
  useEffect(() => {
    setDraft(goals)
    setEditing(false)
    setSaveError(null)
  }, [goals])

  function openEdit() {
    setDraft(goals)
    setSaveError(null)
    setEditing(true)
  }

  async function handleSave() {
    setSaveError(null)
    setSaving(true)
    try {
      await saveGoals(draft)
      setEditing(false)
    } catch {
      setSaveError('Failed to save — please try again')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    setResetting(true)
    try {
      await resetGoals()
      setEditing(false)
    } catch {
      setSaveError('Failed to reset — please try again')
    } finally {
      setResetting(false)
    }
  }

  const remaining = goals.calorie_goal - totals.calories
  const calPct = Math.min(100, Math.round((totals.calories / goals.calorie_goal) * 100))
  const isOver = remaining < 0

  return (
    <div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
      {/* ── Calorie row ── */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-zinc-100">{totals.calories}</span>

          {/* Tappable goal — opens inline editor */}
          <button
            onClick={editing ? () => setEditing(false) : openEdit}
            className="group flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label={editing ? 'Close goal editor' : 'Edit calorie goal'}
          >
            <span className="text-sm">/ {goalsLoading ? '…' : goals.calorie_goal} kcal</span>
            {isOverride && !editing && (
              <span className="text-[10px] bg-zinc-800 text-zinc-500 rounded-full px-1.5 py-0.5 ml-0.5 leading-none">
                custom
              </span>
            )}
            {editing
              ? <X size={13} className="text-zinc-500" />
              : <Pencil size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
            }
          </button>
        </div>

        <div className="text-right">
          <p className={`text-lg font-semibold ${isOver ? 'text-red-400' : 'text-brand'}`}>
            {Math.abs(remaining)}
          </p>
          <p className="text-xs text-zinc-500">{isOver ? 'over goal' : 'remaining'}</p>
        </div>
      </div>

      {/* ── Calorie progress bar ── */}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          style={{ width: `${calPct}%` }}
          className={`h-full rounded-full transition-all duration-300 ${isOver ? 'bg-red-400' : 'bg-brand'}`}
        />
      </div>

      {/* ── Macro bar + labels ── */}
      <div className="space-y-1.5">
        <MacroBar protein={totals.protein_g} carbs={totals.carbs_g} fat={totals.fat_g} />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>
            <span className="text-blue-400 font-medium">{Math.round(totals.protein_g)}g</span>
            <span className="text-zinc-600"> / {goals.protein_goal_g}g P</span>
          </span>
          <span>
            <span className="text-yellow-400 font-medium">{Math.round(totals.carbs_g)}g</span>
            <span className="text-zinc-600"> / {goals.carbs_goal_g}g C</span>
          </span>
          <span>
            <span className="text-red-400 font-medium">{Math.round(totals.fat_g)}g</span>
            <span className="text-zinc-600"> / {goals.fat_goal_g}g F</span>
          </span>
        </div>
      </div>

      {/* ── Inline goal editor ── */}
      {editing && (
        <div className="pt-1 border-t border-zinc-800 space-y-3">
          <p className="text-xs text-zinc-500">Set goals for this day only</p>

          {/* Calorie input full-width */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Calories (kcal)</label>
            <input
              type="number"
              value={draft.calorie_goal}
              onChange={e => setDraft(d => ({ ...d, calorie_goal: parseInt(e.target.value) || 0 }))}
              min="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          {/* Macro inputs in a row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-blue-400">Protein (g)</label>
              <input
                type="number"
                value={draft.protein_goal_g}
                onChange={e => setDraft(d => ({ ...d, protein_goal_g: parseInt(e.target.value) || 0 }))}
                min="0"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-zinc-100 text-sm focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-yellow-400">Carbs (g)</label>
              <input
                type="number"
                value={draft.carbs_goal_g}
                onChange={e => setDraft(d => ({ ...d, carbs_goal_g: parseInt(e.target.value) || 0 }))}
                min="0"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-zinc-100 text-sm focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-red-400">Fat (g)</label>
              <input
                type="number"
                value={draft.fat_goal_g}
                onChange={e => setDraft(d => ({ ...d, fat_goal_g: parseInt(e.target.value) || 0 }))}
                min="0"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-zinc-100 text-sm focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>

          {saveError && (
            <p className="text-xs text-red-400">{saveError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark disabled:opacity-50 text-zinc-900 text-sm font-semibold rounded-lg py-2 transition-colors"
            >
              {saving
                ? <Loader2 size={14} className="animate-spin" />
                : <Check size={14} />}
              Save for today
            </button>

            {isOverride && (
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-400 text-sm rounded-lg px-3 py-2 transition-colors"
                title="Reset to profile default"
              >
                {resetting
                  ? <Loader2 size={14} className="animate-spin" />
                  : <RotateCcw size={14} />}
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
