import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Check, X, Loader2, Dumbbell, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useWorkoutSession, type ExerciseGroup } from '@/hooks/useWorkoutSession'
import ExerciseBrowser from '@/components/workout/ExerciseBrowser'
import { kgToLbs, parseWeightToKg } from '@/lib/units'
import type { ExerciseSet, UnitWeight, WorkoutSession } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Elapsed timer
// ─────────────────────────────────────────────────────────────────────────────

function WorkoutTimer({ startedAt }: { startedAt: string | null }) {
  const startMs = useRef(startedAt ? new Date(startedAt).getTime() : Date.now())
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - startMs.current) / 1000),
  )
  useEffect(() => {
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - startMs.current) / 1000)),
      1000,
    )
    return () => clearInterval(t)
  }, [])
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return (
    <span className="font-mono text-sm tabular-nums text-zinc-400">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Rest timer banner
// ─────────────────────────────────────────────────────────────────────────────

function RestTimerBanner({ onDismiss }: { onDismiss: () => void }) {
  const REST_SECS = 60
  const [seconds, setSeconds] = useState(REST_SECS)

  useEffect(() => {
    if (seconds <= 0) { onDismiss(); return }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds, onDismiss])

  const pct = (seconds / REST_SECS) * 100
  const m = Math.floor(seconds / 60)
  const s = seconds % 60

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-900 border-t border-zinc-700">
      <span className="text-xs font-medium text-zinc-400 shrink-0">Rest</span>
      <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand rounded-full transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-sm font-semibold text-brand tabular-nums shrink-0">
        {m}:{String(s).padStart(2, '0')}
      </span>
      <button
        onClick={onDismiss}
        className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors"
        aria-label="Dismiss rest timer"
      >
        <X size={16} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Set row
// ─────────────────────────────────────────────────────────────────────────────

type SetUpdates = { reps?: number | null; weight_kg?: number | null; completed?: boolean }

function SetRow({
  set,
  setNumber,
  previous,
  unitWeight,
  onUpdate,
  onComplete,
}: {
  set: ExerciseSet
  setNumber: number
  previous: ExerciseGroup['previousSet']
  unitWeight: UnitWeight
  onUpdate: (u: SetUpdates) => void
  onComplete: () => void
}) {
  const [weight, setWeight] = useState(() =>
    set.weight_kg != null
      ? String(unitWeight === 'lbs' ? kgToLbs(set.weight_kg) : set.weight_kg)
      : '',
  )
  const [reps, setReps] = useState(() =>
    set.reps != null ? String(set.reps) : '',
  )

  function commitWeight() {
    const n = parseFloat(weight)
    if (!isNaN(n) && n >= 0) onUpdate({ weight_kg: parseWeightToKg(n, unitWeight) })
  }

  function commitReps() {
    const n = parseInt(reps, 10)
    if (!isNaN(n) && n >= 0) onUpdate({ reps: n })
  }

  function handleComplete() {
    const updates: SetUpdates = { completed: !set.completed }
    const w = parseFloat(weight)
    const r = parseInt(reps, 10)
    if (!isNaN(w) && w >= 0) updates.weight_kg = parseWeightToKg(w, unitWeight)
    if (!isNaN(r) && r >= 0) updates.reps = r
    onUpdate(updates)
    if (!set.completed) onComplete()
  }

  // Previous column: "60 × 8" or "—"
  const prevWeight =
    previous?.weight_kg != null
      ? unitWeight === 'lbs'
        ? kgToLbs(previous.weight_kg)
        : previous.weight_kg
      : null
  const prevText =
    previous
      ? `${prevWeight ?? '—'} × ${previous.reps ?? '—'}`
      : '—'

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 transition-colors ${
        set.completed ? 'bg-brand/5' : ''
      }`}
    >
      {/* Set number */}
      <span className="w-7 text-center text-xs text-zinc-500 shrink-0 font-medium">
        {setNumber}
      </span>

      {/* Previous */}
      <span className="w-14 text-center text-xs text-zinc-600 shrink-0 truncate">
        {prevText}
      </span>

      {/* Weight */}
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.5"
        value={weight}
        onChange={e => setWeight(e.target.value)}
        onBlur={commitWeight}
        onKeyDown={e => e.key === 'Enter' && commitWeight()}
        placeholder="—"
        readOnly={set.completed}
        className="flex-1 h-11 bg-zinc-800 border border-zinc-700 focus:border-brand rounded-lg text-base text-center text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors read-only:opacity-50"
      />

      {/* Reps */}
      <input
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        value={reps}
        onChange={e => setReps(e.target.value)}
        onBlur={commitReps}
        onKeyDown={e => e.key === 'Enter' && commitReps()}
        placeholder="—"
        readOnly={set.completed}
        className="w-16 h-11 bg-zinc-800 border border-zinc-700 focus:border-brand rounded-lg text-base text-center text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors read-only:opacity-50"
      />

      {/* Done toggle */}
      <button
        onClick={handleComplete}
        aria-label={set.completed ? 'Mark incomplete' : 'Mark complete'}
        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
          set.completed
            ? 'bg-brand border-brand text-zinc-900'
            : 'bg-zinc-800 border-zinc-700 text-zinc-600 hover:border-brand hover:text-brand'
        }`}
      >
        <Check size={18} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise block
// ─────────────────────────────────────────────────────────────────────────────

function ExerciseBlock({
  group,
  unitWeight,
  onAddSet,
  onUpdateSet,
  onSetCompleted,
}: {
  group: ExerciseGroup
  unitWeight: UnitWeight
  onAddSet: () => void
  onUpdateSet: (setId: string, updates: SetUpdates) => void
  onSetCompleted: () => void
}) {
  const allDone = group.sets.length > 0 && group.sets.every(s => s.completed)

  return (
    <div className="mb-3 bg-zinc-900 rounded-2xl overflow-hidden">
      {/* Exercise header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/60">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            allDone ? 'bg-brand border-brand' : 'border-zinc-600'
          }`}
        >
          {allDone && <Check size={11} className="text-zinc-900" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100 leading-tight">{group.exercise_name}</p>
        </div>
        <span className="text-xs text-zinc-600">
          {group.sets.filter(s => s.completed).length}/{group.sets.length}
        </span>
      </div>

      {/* Column labels */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-zinc-800/40">
        <span className="w-7 shrink-0" />
        <span className="w-14 text-center text-xs text-zinc-600 shrink-0">Prev</span>
        <span className="flex-1 text-center text-xs text-zinc-600">
          {unitWeight === 'lbs' ? 'lbs' : 'kg'}
        </span>
        <span className="w-16 text-center text-xs text-zinc-600">Reps</span>
        <span className="w-11 shrink-0" />
      </div>

      {/* Set rows — key by ID so each new set mounts fresh */}
      {group.sets.map((set, i) => (
        <SetRow
          key={set.id}
          set={set}
          setNumber={i + 1}
          previous={group.previousSet}
          unitWeight={unitWeight}
          onUpdate={updates => onUpdateSet(set.id, updates)}
          onComplete={() => onSetCompleted()}
        />
      ))}

      {/* Add set */}
      <button
        onClick={onAddSet}
        className="w-full py-2.5 text-xs text-zinc-600 hover:text-brand flex items-center justify-center gap-1.5 transition-colors border-t border-zinc-800/40"
      >
        <Plus size={13} /> Add set
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary screen (shown after finishing)
// ─────────────────────────────────────────────────────────────────────────────

function bestSet(sets: ExerciseSet[]): ExerciseSet | null {
  const done = sets.filter(s => s.completed)
  const pool = done.length ? done : sets
  const withWeight = pool.filter(s => s.weight_kg != null && s.weight_kg > 0)
  if (withWeight.length) {
    return withWeight.reduce((b, s) => (s.weight_kg ?? 0) > (b.weight_kg ?? 0) ? s : b)
  }
  return pool.reduce((b, s) => (s.reps ?? 0) > (b.reps ?? 0) ? s : b, pool[0])
}

function SummaryScreen({
  session,
  exercises,
  unitWeight,
  onBack,
}: {
  session: WorkoutSession
  exercises: ExerciseGroup[]
  unitWeight: UnitWeight
  onBack: () => void
}) {
  const durationMs =
    session.ended_at && session.started_at
      ? new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()
      : 0
  const totalSecs = Math.floor(durationMs / 1000)
  const mins = Math.floor(totalSecs / 60)
  const durationStr =
    mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m ${totalSecs % 60}s`

  const totalDone = exercises.reduce((n, g) => n + g.sets.filter(s => s.completed).length, 0)

  return (
    <div className="flex flex-col h-screen bg-zinc-950 max-w-[480px] mx-auto">
      <header className="shrink-0 flex items-center gap-3 px-4 py-4 border-b border-zinc-800">
        <div className="w-10 h-10 bg-brand/20 rounded-full flex items-center justify-center">
          <Check size={20} className="text-brand" />
        </div>
        <div>
          <h1 className="text-base font-bold text-zinc-100">Workout complete</h1>
          <p className="text-xs text-zinc-500">{session.name ?? 'Quick Workout'}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Duration', value: durationStr },
            { label: 'Exercises', value: String(exercises.length) },
            { label: 'Sets done', value: String(totalDone) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-brand">{value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Per-exercise breakdown */}
        {exercises.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Best sets
            </p>
            {exercises.map(group => {
              const best = bestSet(group.sets)
              const w =
                best?.weight_kg != null
                  ? unitWeight === 'lbs'
                    ? kgToLbs(best.weight_kg)
                    : best.weight_kg
                  : null
              const bestLabel =
                best
                  ? [w != null ? `${w} ${unitWeight}` : null, best.reps != null ? `${best.reps} reps` : null]
                      .filter(Boolean)
                      .join(' × ') || '—'
                  : '—'
              return (
                <div
                  key={group.exercise_id}
                  className="bg-zinc-900 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{group.exercise_name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {group.sets.filter(s => s.completed).length}/{group.sets.length} sets
                    </p>
                  </div>
                  <p className="text-sm text-zinc-400 shrink-0">{bestLabel}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-4 border-t border-zinc-800">
        <button
          onClick={onBack}
          className="w-full bg-brand hover:bg-brand-dark text-zinc-900 font-semibold rounded-xl py-3 text-sm transition-colors"
        >
          Back to workouts
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function ActiveWorkoutPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const unitWeight: UnitWeight = profile?.unit_weight ?? 'kg'

  const {
    session, exercises, loading, error,
    addExercise, addSet, updateSet, finishWorkout,
  } = useWorkoutSession(sessionId!)

  const [showExerciseBrowser, setShowExerciseBrowser] = useState(false)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  // ── Finish ──────────────────────────────────────────────────────────────────
  async function handleFinish() {
    if (!confirm('Finish this workout?')) return
    setFinishing(true)
    try {
      await finishWorkout()
      setShowSummary(true)
    } finally {
      setFinishing(false)
    }
  }

  // ── Summary screen ──────────────────────────────────────────────────────────
  if (showSummary && session) {
    return (
      <SummaryScreen
        session={session}
        exercises={exercises}
        unitWeight={unitWeight}
        onBack={() => navigate('/workouts')}
      />
    )
  }

  // ── Loading / error ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <Loader2 size={28} className="animate-spin text-zinc-600" />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 gap-4">
        <p className="text-zinc-400 text-sm">{error ?? 'Session not found'}</p>
        <button onClick={() => navigate('/workouts')} className="text-brand text-sm">
          Back to workouts
        </button>
      </div>
    )
  }

  // ── Active workout ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-zinc-950 max-w-[480px] mx-auto">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <button
          onClick={() => navigate('/workouts')}
          className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zinc-100 truncate leading-tight">
            {session.name ?? 'Quick Workout'}
          </p>
          <WorkoutTimer startedAt={session.started_at} />
        </div>
        <button
          onClick={handleFinish}
          disabled={finishing}
          className="shrink-0 flex items-center gap-1.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-zinc-900 font-semibold rounded-lg px-3 py-2 text-sm transition-colors"
        >
          {finishing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Finish
        </button>
      </header>

      {/* ── Exercise list ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-3">
        {exercises.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-3">
              <Dumbbell size={26} className="text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-400">No exercises yet</p>
            <p className="text-xs text-zinc-600 mt-1">Tap "Add exercise" below to get started</p>
          </div>
        )}

        {exercises.map(group => (
          <ExerciseBlock
            key={group.exercise_id}
            group={group}
            unitWeight={unitWeight}
            onAddSet={() => addSet(group.exercise_id, group.exercise_name)}
            onUpdateSet={(id, updates) => updateSet(id, updates)}
            onSetCompleted={() => setShowRestTimer(true)}
          />
        ))}

        {/* Add exercise — inline at the bottom of the scroll area */}
        <button
          onClick={() => setShowExerciseBrowser(true)}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700 hover:border-brand hover:text-brand text-zinc-500 rounded-2xl py-3.5 text-sm font-medium transition-colors mt-1"
        >
          <Plus size={16} /> Add exercise
        </button>
      </main>

      {/* ── Fixed bottom: rest timer ─────────────────────────────────────────── */}
      {showRestTimer && (
        <RestTimerBanner onDismiss={() => setShowRestTimer(false)} />
      )}

      {/* ── Exercise browser overlay ─────────────────────────────────────────── */}
      {showExerciseBrowser && (
        <div className="fixed inset-0 z-50 bg-zinc-950 max-w-[480px] mx-auto flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-zinc-800 shrink-0">
            <h2 className="font-semibold text-zinc-100">Add exercise</h2>
            <button
              onClick={() => setShowExerciseBrowser(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <ExerciseBrowser
            actionLabel="Add to workout"
            onSelect={async ex => {
              setShowExerciseBrowser(false)
              await addExercise(ex)
            }}
            userId={user?.id}
            showFavouritesTab
          />
        </div>
      )}
    </div>
  )
}
