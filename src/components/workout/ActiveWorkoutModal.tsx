import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, Check, X, Loader2, Plus, MoreVertical, MoreHorizontal,
  Play, Pause, RotateCcw, HelpCircle, ChevronRight, ArrowRight, Dumbbell, Trash2,
} from 'lucide-react'
import { useActiveWorkoutStore } from '@/store/activeWorkoutStore'
import { useAuthStore } from '@/store/authStore'
import { useWorkoutSession, type ExerciseGroup } from '@/hooks/useWorkoutSession'
import ExerciseBrowser from '@/components/workout/ExerciseBrowser'
import { kgToLbs, parseWeightToKg } from '@/lib/units'
import { getExercise, type Exercise } from '@/services/exerciseDb'
import { deleteSession } from '@/services/workoutSessions'
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
    <span className="font-mono tabular-nums">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Rest timer bar
// ─────────────────────────────────────────────────────────────────────────────

function RestTimerBar({ defaultSecs, triggerKey }: { defaultSecs: number; triggerKey: number }) {
  const [secs, setSecs] = useState(defaultSecs)
  const [running, setRunning] = useState(false)

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

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-zinc-800">
      <span className="text-xs font-medium text-zinc-500 shrink-0">Rest</span>
      <span className={`font-mono text-lg font-bold tabular-nums w-14 ${
        secs <= 0 ? 'text-brand' : running ? 'text-zinc-100' : 'text-zinc-600'
      }`}>
        {m}:{String(s).padStart(2, '0')}
      </span>
      <div className="flex-1" />
      <button
        onClick={() => { setSecs(defaultSecs); setRunning(false) }}
        className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-zinc-300"
        aria-label="Reset"
      >
        <RotateCcw size={16} />
      </button>
      <button
        onClick={() => setRunning(r => !r)}
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
          running ? 'bg-brand text-zinc-900' : 'bg-zinc-800 text-zinc-400'
        }`}
        aria-label={running ? 'Pause' : 'Start'}
      >
        {running ? <Pause size={16} /> : <Play size={16} />}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Set row
// ─────────────────────────────────────────────────────────────────────────────

type SetUpdates = { reps?: number | null; weight_kg?: number | null; completed?: boolean }

function SetRow({
  set, isWarmup, displayNum, unitWeight,
  onUpdate, onComplete, onRemove, menuOpen, onMenuToggle,
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
  const [reps, setReps] = useState(() => set.reps != null ? String(set.reps) : '')

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
      const w = parseFloat(weight); const r = parseInt(reps, 10)
      if (!isNaN(w) && w >= 0) updates.weight_kg = parseWeightToKg(w, unitWeight)
      if (!isNaN(r) && r >= 0) updates.reps = r
    }
    onUpdate(updates)
    if (!set.completed) onComplete()
  }

  const displayWeight = set.weight_kg != null
    ? (unitWeight === 'lbs' ? kgToLbs(set.weight_kg) : set.weight_kg) : null

  return (
    <div className={`flex items-center gap-2 px-3 min-h-[44px] py-1 transition-colors ${
      set.completed ? (isWarmup ? 'bg-zinc-800/20' : 'bg-brand/5') : ''
    }`}>
      <button
        onClick={handleToggle}
        className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
          set.completed
            ? isWarmup ? 'bg-zinc-600 border-zinc-600 text-white' : 'bg-brand border-brand text-zinc-900'
            : 'border-zinc-600 text-zinc-500 hover:border-zinc-400 hover:text-zinc-400'
        }`}
      >
        {isWarmup ? 'W' : displayNum}
      </button>

      {set.completed ? (
        <p className="flex-1 min-w-0 text-center text-sm text-zinc-400">
          {displayWeight != null ? `${displayWeight} ${unitWeight}` : '—'}
        </p>
      ) : (
        <input
          type="number" inputMode="decimal" min="0" step="0.5"
          value={weight} onChange={e => setWeight(e.target.value)}
          onBlur={commitWeight} onKeyDown={e => e.key === 'Enter' && commitWeight()}
          placeholder={unitWeight}
          className="flex-1 min-w-0 h-9 bg-zinc-800 border border-zinc-700 focus:border-brand rounded-lg text-sm text-center text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
        />
      )}

      {set.completed ? (
        <p className="flex-1 min-w-0 text-center text-sm text-zinc-400">
          {set.reps != null ? `${set.reps} reps` : '—'}
        </p>
      ) : (
        <input
          type="number" inputMode="numeric" min="0" step="1"
          value={reps} onChange={e => setReps(e.target.value)}
          onBlur={commitReps} onKeyDown={e => e.key === 'Enter' && commitReps()}
          placeholder="reps"
          className="flex-1 min-w-0 h-9 bg-zinc-800 border border-zinc-700 focus:border-brand rounded-lg text-sm text-center text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
        />
      )}

      <div className="relative shrink-0">
        <button onClick={onMenuToggle} className="w-8 h-8 flex items-center justify-center text-zinc-700 hover:text-zinc-400">
          <MoreVertical size={14} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-20 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl py-1 w-28">
            <button
              onClick={() => { onRemove(); onMenuToggle() }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-700/60"
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
// Exercise log block (inline expanded set logging)
// ─────────────────────────────────────────────────────────────────────────────

function ExerciseLogBlock({
  group, unitWeight, onAddSet, onAddWarmup, onUpdateSet, onRemoveSet,
  onSetCompleted, onShowInstructions,
}: {
  group: ExerciseGroup
  unitWeight: UnitWeight
  onAddSet: () => void
  onAddWarmup: () => void
  onUpdateSet: (setId: string, updates: SetUpdates) => void
  onRemoveSet: (setId: string) => void
  onSetCompleted: (isWarmup: boolean) => void
  onShowInstructions: () => void
}) {
  const [activeSetMenu, setActiveSetMenu] = useState<string | null>(null)
  const warmupSets = group.sets.filter(s => s.set_number === 0)
  const regularSets = group.sets.filter(s => s.set_number > 0)

  return (
    <div className="bg-zinc-800/40 mx-3 mb-3 rounded-2xl overflow-hidden">
      {/* Mini header within expanded block */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-700/40">
        <HelpCircle
          size={14}
          className="text-zinc-600 cursor-pointer hover:text-zinc-400"
          onClick={onShowInstructions}
        />
        <p className="flex-1 text-xs font-semibold text-zinc-400 uppercase tracking-wide truncate">
          {group.exercise_name}
        </p>
      </div>

      {/* Warm-up add row */}
      <button
        onClick={onAddWarmup}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400/70 hover:text-red-400 transition-colors border-b border-zinc-700/40"
      >
        <Plus size={13} strokeWidth={2.5} /> Warm-up
      </button>

      {/* Warmup set rows */}
      {warmupSets.map(set => (
        <SetRow
          key={set.id} set={set} isWarmup displayNum={0} unitWeight={unitWeight}
          onUpdate={u => onUpdateSet(set.id, u)}
          onComplete={() => onSetCompleted(true)}
          onRemove={() => onRemoveSet(set.id)}
          menuOpen={activeSetMenu === set.id}
          onMenuToggle={() => setActiveSetMenu(activeSetMenu === set.id ? null : set.id)}
        />
      ))}

      {/* Working set rows */}
      {regularSets.map((set, i) => (
        <SetRow
          key={set.id} set={set} isWarmup={false} displayNum={i + 1} unitWeight={unitWeight}
          onUpdate={u => onUpdateSet(set.id, u)}
          onComplete={() => onSetCompleted(false)}
          onRemove={() => onRemoveSet(set.id)}
          menuOpen={activeSetMenu === set.id}
          onMenuToggle={() => setActiveSetMenu(activeSetMenu === set.id ? null : set.id)}
        />
      ))}

      {/* Add set */}
      <button
        onClick={onAddSet}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400/70 hover:text-red-400 transition-colors border-t border-zinc-700/40"
      >
        <Plus size={13} strokeWidth={2.5} /> Set
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise overview row (collapsed state)
// ─────────────────────────────────────────────────────────────────────────────

function ExerciseOverviewRow({
  group, isExpanded, onToggle, onRemove,
}: {
  group: ExerciseGroup
  isExpanded: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const workingSets = group.sets.filter(s => s.set_number > 0)
  const completedCount = workingSets.filter(s => s.completed).length
  const allDone = workingSets.length > 0 && completedCount === workingSets.length
  const subtitle = workingSets.length === 0
    ? 'No sets'
    : completedCount === workingSets.length
      ? `${workingSets.length} sets`
      : `${completedCount}/${workingSets.length} sets`

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800/40 ${
      isExpanded ? 'bg-zinc-800/30' : ''
    }`}>
      {/* Completion circle */}
      <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
        allDone ? 'bg-brand border-brand' : 'border-zinc-600'
      }`}>
        {allDone
          ? <Check size={15} className="text-zinc-900" />
          : <Plus size={14} className="text-zinc-600" />
        }
      </div>

      {/* Name + count — tapping expands */}
      <button className="flex-1 min-w-0 text-left" onClick={onToggle}>
        <p className="text-sm font-bold text-zinc-100 leading-snug">{group.exercise_name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
      </button>

      {/* Three-dot */}
      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-zinc-400"
        >
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-20 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl py-1 w-36">
            <button
              onClick={() => { onRemove(); setMenuOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-700/60"
            >
              Remove exercise
            </button>
          </div>
        )}
      </div>

      {/* Expand chevron */}
      <button
        onClick={onToggle}
        className="w-8 h-8 flex items-center justify-center text-zinc-500 shrink-0"
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        <ChevronRight size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Instructions modal
// ─────────────────────────────────────────────────────────────────────────────

function InstructionsModal({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-60 flex items-end bg-black/60" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full bg-zinc-900 rounded-t-2xl max-h-[80%] flex flex-col">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800 shrink-0">
          <h3 className="font-semibold text-zinc-100 flex-1 capitalize">{exercise.name}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-zinc-500">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Primary muscles</p>
            <p className="text-sm text-zinc-300 capitalize">{exercise.primaryMuscles.join(', ')}</p>
          </div>
          {exercise.secondaryMuscles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Secondary muscles</p>
              <p className="text-sm text-zinc-300 capitalize">{exercise.secondaryMuscles.join(', ')}</p>
            </div>
          )}
          {exercise.instructions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Instructions</p>
              <ol className="space-y-2.5">
                {exercise.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-zinc-300">
                    <span className="text-brand shrink-0 font-semibold">{i + 1}.</span>
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
// Summary view (shown after finishing)
// ─────────────────────────────────────────────────────────────────────────────

function bestSet(sets: ExerciseSet[]): ExerciseSet | null {
  const done = sets.filter(s => s.completed)
  const pool = done.length ? done : sets
  const withWeight = pool.filter(s => s.weight_kg != null && s.weight_kg > 0)
  if (withWeight.length) return withWeight.reduce((b, s) => (s.weight_kg ?? 0) > (b.weight_kg ?? 0) ? s : b)
  if (!pool.length) return null
  return pool.reduce((b, s) => (s.reps ?? 0) > (b.reps ?? 0) ? s : b, pool[0])
}

function SummaryView({
  session, exercises, unitWeight, onDone,
}: {
  session: WorkoutSession
  exercises: ExerciseGroup[]
  unitWeight: UnitWeight
  onDone: () => void
}) {
  const durationMs = session.ended_at && session.started_at
    ? new Date(session.ended_at).getTime() - new Date(session.started_at).getTime() : 0
  const totalSecs = Math.floor(durationMs / 1000)
  const mins = Math.floor(totalSecs / 60)
  const durationStr = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m ${totalSecs % 60}s`
  const totalDone = exercises.reduce((n, g) => n + g.sets.filter(s => s.completed && s.set_number > 0).length, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800 shrink-0">
        <div className="w-10 h-10 bg-brand/20 rounded-full flex items-center justify-center">
          <Check size={20} className="text-brand" />
        </div>
        <div>
          <h2 className="text-base font-bold text-zinc-100">Workout complete</h2>
          <p className="text-xs text-zinc-500">{session.name ?? 'Quick Workout'}</p>
        </div>
      </div>

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
              const w = best?.weight_kg != null
                ? (unitWeight === 'lbs' ? kgToLbs(best.weight_kg) : best.weight_kg) : null
              const bestLabel = best
                ? [w != null ? `${w} ${unitWeight}` : null, best.reps != null ? `${best.reps} reps` : null]
                    .filter(Boolean).join(' × ') || '—'
                : '—'
              return (
                <div key={group.exercise_id} className="bg-zinc-900 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{group.exercise_name}</p>
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
          onClick={onDone}
          className="w-full bg-brand hover:bg-brand-dark text-zinc-900 font-semibold rounded-xl py-3 text-sm transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────────

export default function ActiveWorkoutModal() {
  const navigate = useNavigate()
  const { sessionId, sessionName, startedAt, isOpen, minimise, closeWorkout } = useActiveWorkoutStore()
  const { user, profile } = useAuthStore()
  const unitWeight: UnitWeight = profile?.unit_weight ?? 'kg'

  const {
    session, exercises, loading,
    addExercise, addSet, addWarmupSet, updateSet, removeSet, removeExercise, finishWorkout,
  } = useWorkoutSession(sessionId ?? '')

  // Which exercise is expanded for set logging
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const prevExerciseCount = useRef(0)

  // Auto-expand newly added exercises
  useEffect(() => {
    if (exercises.length > prevExerciseCount.current) {
      setExpandedId(exercises[exercises.length - 1]?.exercise_id ?? null)
    }
    prevExerciseCount.current = exercises.length
  }, [exercises.length])

  const [showExerciseBrowser, setShowExerciseBrowser] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [workoutPaused, setWorkoutPaused] = useState(false)
  const [restTriggerKey, setRestTriggerKey] = useState(0)
  const [instructionsExercise, setInstructionsExercise] = useState<Exercise | null>(null)

  async function handleShowInstructions(exerciseId: string) {
    const ex = await getExercise(exerciseId)
    if (ex) setInstructionsExercise(ex)
  }

  async function handleDelete() {
    if (!confirm('Delete this workout? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteSession(sessionId!)
      closeWorkout()
    } finally {
      setDeleting(false)
    }
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

  function handleDone() {
    closeWorkout()
    navigate('/workouts')
  }

  // "Up next": first exercise where not all working sets are done
  const upNext = exercises.find(g => {
    const working = g.sets.filter(s => s.set_number > 0)
    return working.length === 0 || working.some(s => !s.completed)
  })

  // Don't render if no active session
  if (!sessionId) return null

  return (
    <>
      {/* Slide-up modal */}
      <div
        className={`absolute inset-0 z-50 flex flex-col bg-zinc-950 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
      >
        {showSummary && session ? (
          <SummaryView
            session={session}
            exercises={exercises}
            unitWeight={unitWeight}
            onDone={handleDone}
          />
        ) : (
          <>
            {/* ── Top bar ────────────────────────────────────────────────── */}
            <header className="shrink-0 px-4 pt-4 pb-3 border-b border-zinc-800">
              {/* Row 1: controls */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={minimise}
                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
                    aria-label="Minimise"
                  >
                    <ChevronDown size={22} />
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-10 h-10 flex items-center justify-center text-zinc-600 hover:text-red-400 disabled:opacity-40 transition-colors"
                    aria-label="Delete workout"
                  >
                    {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setWorkoutPaused(p => !p)}
                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
                    aria-label={workoutPaused ? 'Resume' : 'Pause'}
                  >
                    {workoutPaused ? <Play size={18} /> : <Pause size={18} />}
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={finishing}
                    className="flex items-center gap-1.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-zinc-900 font-bold rounded-full px-5 py-2 text-sm transition-colors"
                  >
                    {finishing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
                    Finish
                  </button>
                </div>
              </div>

              {/* Row 2: large timer + workout name */}
              <p className="text-5xl font-bold text-zinc-100 tabular-nums">
                <WorkoutTimer startedAt={startedAt} paused={workoutPaused} />
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                {sessionName ?? 'Quick Workout'} · In progress
              </p>
            </header>

            {/* ── Exercise overview list ──────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 size={28} className="animate-spin text-zinc-600" />
                </div>
              ) : (
                <>
                  {exercises.length === 0 && (
                    <div className="flex flex-col items-center py-16 text-center px-8">
                      <Dumbbell size={32} className="text-zinc-700 mb-3" />
                      <p className="text-sm text-zinc-400 font-medium">No exercises yet</p>
                      <p className="text-xs text-zinc-600 mt-1">Tap "Add exercises" below to get started</p>
                    </div>
                  )}

                  {exercises.map(group => (
                    <div key={group.exercise_id}>
                      <ExerciseOverviewRow
                        group={group}
                        isExpanded={expandedId === group.exercise_id}
                        onToggle={() => setExpandedId(
                          expandedId === group.exercise_id ? null : group.exercise_id
                        )}
                        onRemove={() => removeExercise(group.exercise_id)}
                      />
                      {expandedId === group.exercise_id && (
                        <ExerciseLogBlock
                          group={group}
                          unitWeight={unitWeight}
                          onAddSet={() => addSet(group.exercise_id, group.exercise_name)}
                          onAddWarmup={() => addWarmupSet(group.exercise_id, group.exercise_name)}
                          onUpdateSet={(id, u) => updateSet(id, u)}
                          onRemoveSet={id => removeSet(id)}
                          onSetCompleted={isWarmup => { if (!isWarmup) setRestTriggerKey(k => k + 1) }}
                          onShowInstructions={() => handleShowInstructions(group.exercise_id)}
                        />
                      )}
                    </div>
                  ))}

                  {/* Add exercises row */}
                  <button
                    onClick={() => setShowExerciseBrowser(true)}
                    className="w-full flex items-center gap-3 px-4 py-4 border-b border-zinc-800/40 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full border-2 border-zinc-700 flex items-center justify-center shrink-0">
                      <Plus size={16} />
                    </div>
                    <span className="text-sm font-medium">Add exercises</span>
                  </button>
                </>
              )}
            </main>

            {/* ── Bottom: rest timer + up next ───────────────────────────── */}
            <div className="shrink-0 border-t border-zinc-800">
              <RestTimerBar defaultSecs={DEFAULT_REST_SECS} triggerKey={restTriggerKey} />
              {upNext && (
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border-t border-zinc-800">
                  <div className="w-8 h-8 rounded-full border-2 border-zinc-600 flex items-center justify-center shrink-0">
                    <Check size={13} className="text-zinc-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-100 truncate">{upNext.exercise_name}</p>
                    <p className="text-xs text-zinc-500">Up next</p>
                  </div>
                  <button
                    onClick={() => setExpandedId(upNext.exercise_id)}
                    className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold rounded-xl px-4 py-2 text-sm transition-colors shrink-0"
                  >
                    Next <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Exercise browser overlay */}
        {showExerciseBrowser && (
          <div className="absolute inset-0 z-10 bg-zinc-950 flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-zinc-800 shrink-0">
              <h2 className="font-semibold text-zinc-100">Add exercise</h2>
              <button onClick={() => setShowExerciseBrowser(false)} className="text-zinc-500 hover:text-zinc-300">
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

        {/* Instructions modal */}
        {instructionsExercise && (
          <InstructionsModal
            exercise={instructionsExercise}
            onClose={() => setInstructionsExercise(null)}
          />
        )}
      </div>
    </>
  )
}
