import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Check, X, Loader2, Dumbbell, Plus, MoreVertical,
  Play, Pause, RotateCcw, HelpCircle,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useWorkoutSession, type ExerciseGroup } from '@/hooks/useWorkoutSession'
import ExerciseBrowser from '@/components/workout/ExerciseBrowser'
import { kgToLbs, parseWeightToKg } from '@/lib/units'
import { getExercise, type Exercise } from '@/services/exerciseDb'
import type { ExerciseSet, UnitWeight, WorkoutSession } from '@/types'

const DEFAULT_REST_SECS = 120

// ─────────────────────────────────────────────────────────────────────────────
// Elapsed timer
// ─────────────────────────────────────────────────────────────────────────────

function WorkoutTimer({ startedAt, paused }: { startedAt: string | null; paused: boolean }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - (startedAt ? new Date(startedAt).getTime() : Date.now())) / 1000),
  )

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [paused])

  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return (
    <span className="font-mono text-sm tabular-nums text-zinc-400">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Rest timer bar (fixed bottom, always visible)
// ─────────────────────────────────────────────────────────────────────────────

function RestTimerBar({
  defaultSecs,
  triggerKey,
}: {
  defaultSecs: number
  triggerKey: number
}) {
  const [secs, setSecs] = useState(defaultSecs)
  const [running, setRunning] = useState(false)

  // Auto-reset and start when a set completes
  useEffect(() => {
    if (triggerKey === 0) return
    setSecs(defaultSecs)
    setRunning(true)
  }, [triggerKey, defaultSecs])

  useEffect(() => {
    if (!running) return
    if (secs <= 0) { setRunning(false); return }
    const t = setTimeout(() => setSecs(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [running, secs])

  const m = Math.floor(secs / 60)
  const s = secs % 60
  const done = secs <= 0

  return (
    <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-zinc-900 border-t border-zinc-800 safe-bottom">
      <span className="text-xs font-medium text-zinc-500 shrink-0">Rest</span>
      <span
        className={`font-mono text-xl font-bold tabular-nums w-14 ${
          done ? 'text-brand' : running ? 'text-zinc-100' : 'text-zinc-600'
        }`}
      >
        {m}:{String(s).padStart(2, '0')}
      </span>
      <div className="flex-1" />
      <button
        onClick={() => { setSecs(defaultSecs); setRunning(false) }}
        className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
        aria-label="Reset rest timer"
      >
        <RotateCcw size={17} />
      </button>
      <button
        onClick={() => setRunning(r => !r)}
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
          running
            ? 'bg-brand text-zinc-900'
            : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
        }`}
        aria-label={running ? 'Pause rest timer' : 'Start rest timer'}
      >
        {running ? <Pause size={17} /> : <Play size={17} />}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise instructions modal
// ─────────────────────────────────────────────────────────────────────────────

function InstructionsModal({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[480px] mx-auto bg-zinc-900 rounded-t-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800 shrink-0">
          <h3 className="font-semibold text-zinc-100 flex-1 capitalize">{exercise.name}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
              Primary muscles
            </p>
            <p className="text-sm text-zinc-300 capitalize">
              {exercise.primaryMuscles.join(', ')}
            </p>
          </div>
          {exercise.secondaryMuscles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                Secondary muscles
              </p>
              <p className="text-sm text-zinc-300 capitalize">
                {exercise.secondaryMuscles.join(', ')}
              </p>
            </div>
          )}
          {exercise.instructions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                Instructions
              </p>
              <ol className="space-y-2.5">
                {exercise.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-zinc-300">
                    <span className="text-brand shrink-0 font-semibold leading-snug">{i + 1}.</span>
                    <span className="leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Set row
// ─────────────────────────────────────────────────────────────────────────────

type SetUpdates = { reps?: number | null; weight_kg?: number | null; completed?: boolean }

function SetRow({
  set,
  isWarmup,
  displayNum,
  unitWeight,
  onUpdate,
  onComplete,
  onRemove,
  menuOpen,
  onMenuToggle,
}: {
  set: ExerciseSet
  isWarmup: boolean
  displayNum: number
  unitWeight: UnitWeight
  onUpdate: (u: SetUpdates) => void
  onComplete: () => void
  onRemove: () => void
  menuOpen: boolean
  onMenuToggle: () => void
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

  function handleToggle() {
    const updates: SetUpdates = { completed: !set.completed }
    if (!set.completed) {
      const w = parseFloat(weight)
      const r = parseInt(reps, 10)
      if (!isNaN(w) && w >= 0) updates.weight_kg = parseWeightToKg(w, unitWeight)
      if (!isNaN(r) && r >= 0) updates.reps = r
    }
    onUpdate(updates)
    if (!set.completed) onComplete()
  }

  const displayWeight =
    set.weight_kg != null
      ? unitWeight === 'lbs' ? kgToLbs(set.weight_kg) : set.weight_kg
      : null

  return (
    <div
      className={`flex items-center gap-2 px-3 min-h-[44px] py-1 transition-colors ${
        set.completed ? (isWarmup ? 'bg-zinc-800/20' : 'bg-brand/5') : ''
      }`}
    >
      {/* Circle: the completion toggle */}
      <button
        onClick={handleToggle}
        className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
          set.completed
            ? isWarmup
              ? 'bg-zinc-600 border-zinc-600 text-white'
              : 'bg-brand border-brand text-zinc-900'
            : 'border-zinc-600 text-zinc-500 hover:border-zinc-400 hover:text-zinc-400'
        }`}
        aria-label={set.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {isWarmup ? 'W' : displayNum}
      </button>

      {/* Weight column — equal flex */}
      {set.completed ? (
        <p className="flex-1 text-center text-sm text-zinc-400">
          {displayWeight != null ? `${displayWeight} ${unitWeight}` : '—'}
        </p>
      ) : (
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.5"
          value={weight}
          onChange={e => setWeight(e.target.value)}
          onBlur={commitWeight}
          onKeyDown={e => e.key === 'Enter' && commitWeight()}
          placeholder={unitWeight}
          className="flex-1 h-9 bg-zinc-800 border border-zinc-700 focus:border-brand rounded-lg text-sm text-center text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
        />
      )}

      {/* Reps column — equal flex */}
      {set.completed ? (
        <p className="flex-1 text-center text-sm text-zinc-400">
          {set.reps != null ? `${set.reps} reps` : '—'}
        </p>
      ) : (
        <input
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={reps}
          onChange={e => setReps(e.target.value)}
          onBlur={commitReps}
          onKeyDown={e => e.key === 'Enter' && commitReps()}
          placeholder="reps"
          className="flex-1 h-9 bg-zinc-800 border border-zinc-700 focus:border-brand rounded-lg text-sm text-center text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
        />
      )}

      {/* Three-dot menu */}
      <div className="relative shrink-0">
        <button
          onClick={onMenuToggle}
          className="w-8 h-8 flex items-center justify-center text-zinc-700 hover:text-zinc-400 transition-colors"
          aria-label="Set options"
        >
          <MoreVertical size={14} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-20 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl py-1 w-28">
            <button
              onClick={() => { onRemove(); onMenuToggle() }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-700/60 transition-colors"
            >
              Delete set
            </button>
          </div>
        )}
      </div>
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
  onAddWarmup,
  onUpdateSet,
  onRemoveSet,
  onRemoveExercise,
  onSetCompleted,
  onShowInstructions,
}: {
  group: ExerciseGroup
  unitWeight: UnitWeight
  onAddSet: () => void
  onAddWarmup: () => void
  onUpdateSet: (setId: string, updates: SetUpdates) => void
  onRemoveSet: (setId: string) => void
  onRemoveExercise: () => void
  onSetCompleted: (isWarmup: boolean) => void
  onShowInstructions: () => void
}) {
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [activeSetMenu, setActiveSetMenu] = useState<string | null>(null)

  const warmupSets = group.sets.filter(s => s.set_number === 0)
  const regularSets = group.sets.filter(s => s.set_number > 0)

  return (
    <div className="mb-3 bg-zinc-900 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-zinc-800/60">
        <p className="flex-1 text-sm font-bold text-zinc-100 leading-tight">
          {group.exercise_name}
        </p>
        <button
          onClick={onShowInstructions}
          className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
          aria-label="Exercise instructions"
        >
          <HelpCircle size={16} />
        </button>
        <div className="relative shrink-0">
          <button
            onClick={() => { setHeaderMenuOpen(o => !o); setActiveSetMenu(null) }}
            className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors"
            aria-label="Exercise options"
          >
            <MoreVertical size={16} />
          </button>
          {headerMenuOpen && (
            <div className="absolute right-0 top-full z-20 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl py-1 w-36">
              <button
                onClick={() => { onRemoveExercise(); setHeaderMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-700/60 transition-colors"
              >
                Remove exercise
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Warm-up row — always at the top of the body */}
      <button
        onClick={onAddWarmup}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400/70 hover:text-red-400 transition-colors border-b border-zinc-800/40"
      >
        <Plus size={14} strokeWidth={2.5} />
        Warm-up
      </button>

      {/* Warmup set rows */}
      {warmupSets.map(set => (
        <SetRow
          key={set.id}
          set={set}
          isWarmup
          displayNum={0}
          unitWeight={unitWeight}
          onUpdate={updates => onUpdateSet(set.id, updates)}
          onComplete={() => onSetCompleted(true)}
          onRemove={() => onRemoveSet(set.id)}
          menuOpen={activeSetMenu === set.id}
          onMenuToggle={() => {
            setActiveSetMenu(activeSetMenu === set.id ? null : set.id)
            setHeaderMenuOpen(false)
          }}
        />
      ))}

      {/* Working set rows */}
      {regularSets.map((set, i) => (
        <SetRow
          key={set.id}
          set={set}
          isWarmup={false}
          displayNum={i + 1}
          unitWeight={unitWeight}
          onUpdate={updates => onUpdateSet(set.id, updates)}
          onComplete={() => onSetCompleted(false)}
          onRemove={() => onRemoveSet(set.id)}
          menuOpen={activeSetMenu === set.id}
          onMenuToggle={() => {
            setActiveSetMenu(activeSetMenu === set.id ? null : set.id)
            setHeaderMenuOpen(false)
          }}
        />
      ))}

      {/* Add set */}
      <button
        onClick={onAddSet}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400/70 hover:text-red-400 transition-colors border-t border-zinc-800/40"
      >
        <Plus size={14} strokeWidth={2.5} />
        Set
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary screen
// ─────────────────────────────────────────────────────────────────────────────

function bestSet(sets: ExerciseSet[]): ExerciseSet | null {
  const done = sets.filter(s => s.completed)
  const pool = done.length ? done : sets
  const withWeight = pool.filter(s => s.weight_kg != null && s.weight_kg > 0)
  if (withWeight.length) {
    return withWeight.reduce((b, s) => (s.weight_kg ?? 0) > (b.weight_kg ?? 0) ? s : b)
  }
  if (!pool.length) return null
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

  const totalDone = exercises.reduce(
    (n, g) => n + g.sets.filter(s => s.completed && s.set_number > 0).length,
    0,
  )

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

        {exercises.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Best sets</p>
            {exercises.map(group => {
              const best = bestSet(group.sets)
              const w =
                best?.weight_kg != null
                  ? unitWeight === 'lbs' ? kgToLbs(best.weight_kg) : best.weight_kg
                  : null
              const bestLabel =
                best
                  ? [
                      w != null ? `${w} ${unitWeight}` : null,
                      best.reps != null ? `${best.reps} reps` : null,
                    ]
                      .filter(Boolean)
                      .join(' × ') || '—'
                  : '—'
              return (
                <div
                  key={group.exercise_id}
                  className="bg-zinc-900 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">
                      {group.exercise_name}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {group.sets.filter(s => s.completed && s.set_number > 0).length}/
                      {group.sets.filter(s => s.set_number > 0).length} sets
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
    addExercise, addSet, addWarmupSet, updateSet, removeSet, removeExercise, finishWorkout,
  } = useWorkoutSession(sessionId!)

  const [showExerciseBrowser, setShowExerciseBrowser] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [workoutPaused, setWorkoutPaused] = useState(false)
  const [restTriggerKey, setRestTriggerKey] = useState(0)
  const [instructionsExercise, setInstructionsExercise] = useState<Exercise | null>(null)

  async function handleShowInstructions(exerciseId: string) {
    const ex = await getExercise(exerciseId)
    if (ex) setInstructionsExercise(ex)
  }

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
      <header className="shrink-0 flex items-center gap-2 px-3 py-3 bg-zinc-900 border-b border-zinc-800">
        <button
          onClick={() => navigate('/workouts')}
          className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          aria-label="Back"
        >
          <X size={20} />
        </button>

        <div className="flex-1 min-w-0 px-1">
          <p className="text-sm font-bold text-zinc-100 truncate leading-tight">
            {session.name ?? 'Quick Workout'}
          </p>
          <WorkoutTimer startedAt={session.started_at} paused={workoutPaused} />
        </div>

        <button
          onClick={() => setWorkoutPaused(p => !p)}
          className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          aria-label={workoutPaused ? 'Resume workout' : 'Pause workout'}
        >
          {workoutPaused ? <Play size={18} /> : <Pause size={18} />}
        </button>

        <button
          onClick={handleFinish}
          disabled={finishing}
          className="shrink-0 flex items-center gap-1.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-zinc-900 font-bold rounded-xl px-3 py-2 text-sm transition-colors"
        >
          {finishing
            ? <Loader2 size={14} className="animate-spin" />
            : <Check size={14} strokeWidth={3} />}
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
            onAddWarmup={() => addWarmupSet(group.exercise_id, group.exercise_name)}
            onUpdateSet={(id, updates) => updateSet(id, updates)}
            onRemoveSet={id => removeSet(id)}
            onRemoveExercise={() => removeExercise(group.exercise_id)}
            onSetCompleted={isWarmup => { if (!isWarmup) setRestTriggerKey(k => k + 1) }}
            onShowInstructions={() => handleShowInstructions(group.exercise_id)}
          />
        ))}

        <button
          onClick={() => setShowExerciseBrowser(true)}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700 hover:border-brand hover:text-brand text-zinc-500 rounded-2xl py-3.5 text-sm font-medium transition-colors mt-1"
        >
          <Plus size={16} /> Add exercise
        </button>
      </main>

      {/* ── Rest timer (always visible) ──────────────────────────────────────── */}
      <RestTimerBar defaultSecs={DEFAULT_REST_SECS} triggerKey={restTriggerKey} />

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

      {/* ── Instructions modal ───────────────────────────────────────────────── */}
      {instructionsExercise && (
        <InstructionsModal
          exercise={instructionsExercise}
          onClose={() => setInstructionsExercise(null)}
        />
      )}
    </div>
  )
}
