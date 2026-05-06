import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, ChevronLeft, Loader2, X,
  ChevronUp, ChevronDown, Dumbbell, Play, Check, Zap,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useActiveWorkoutStore } from '@/store/activeWorkoutStore'
import { type Exercise } from '@/services/exerciseDb'
import {
  getTemplates, getTemplate, createTemplate, deleteTemplate,
  addExerciseToTemplate, removeExerciseFromTemplate, reorderTemplateExercises,
  updateTemplateExercise,
  type TemplateWithExercises,
} from '@/services/workoutTemplates'
import { createSession, addSet as dbAddSet } from '@/services/workoutSessions'
import { lbsToKg } from '@/lib/units'
import ExerciseBrowser from '@/components/workout/ExerciseBrowser'
import type { WorkoutTemplate, TemplateExercise, UnitWeight } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// (ExerciseBrowser, ExerciseDetail and Pill are in src/components/workout/ExerciseBrowser.tsx)
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// Template detail — shows exercises with reorder and add
// ─────────────────────────────────────────────────────────────────────────────

function TemplateDetail({
  template: initial,
  userId,
  onBack,
  onDeleted,
  onStarted,
}: {
  template: TemplateWithExercises
  userId: string
  onBack: () => void
  onDeleted: () => void
  onStarted: (sessionId: string, startedAt: string) => void
}) {
  const [template, setTemplate] = useState(initial)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  // Inline sets×reps editing
  const [editingExId, setEditingExId] = useState<string | null>(null)
  const [editSets, setEditSets] = useState('')
  const [editReps, setEditReps] = useState('')

  function startEditEx(ex: TemplateExercise) {
    setEditingExId(ex.id)
    setEditSets(String(ex.default_sets))
    setEditReps(String(ex.default_reps))
  }

  async function commitEditEx(ex: TemplateExercise) {
    const newSets = Math.max(1, parseInt(editSets, 10) || ex.default_sets)
    const newReps = Math.max(1, parseInt(editReps, 10) || ex.default_reps)
    setEditingExId(null)
    // Optimistic update
    setTemplate(t => ({
      ...t,
      exercises: t.exercises.map(e =>
        e.id === ex.id ? { ...e, default_sets: newSets, default_reps: newReps } : e,
      ),
    }))
    await updateTemplateExercise(ex.id, { default_sets: newSets, default_reps: newReps })
  }

  function handleEditKeyDown(e: React.KeyboardEvent, ex: TemplateExercise) {
    if (e.key === 'Enter') { e.preventDefault(); commitEditEx(ex) }
    if (e.key === 'Escape') setEditingExId(null)
  }

  async function handleAddExercise(exercise: Exercise) {
    setAddingId(exercise.id)
    try {
      const newEx = await addExerciseToTemplate(
        template.id,
        exercise,
        template.exercises.length,
      )
      setTemplate(t => ({ ...t, exercises: [...t.exercises, newEx] }))
      setShowExercisePicker(false)
    } finally {
      setAddingId(null)
    }
  }

  async function handleRemoveExercise(ex: TemplateExercise) {
    await removeExerciseFromTemplate(ex.id)
    setTemplate(t => ({
      ...t,
      exercises: t.exercises.filter(e => e.id !== ex.id),
    }))
  }

  async function move(index: number, dir: -1 | 1) {
    const exs = [...template.exercises]
    const swap = index + dir
    if (swap < 0 || swap >= exs.length) return
    ;[exs[index], exs[swap]] = [exs[swap], exs[index]]
    const updated = exs.map((e, i) => ({ ...e, order_index: i }))
    setTemplate(t => ({ ...t, exercises: updated }))
    await reorderTemplateExercises(updated.map(e => ({ id: e.id, order_index: e.order_index })))
  }

  async function handleDelete() {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteTemplate(template.id)
      onDeleted()
    } finally {
      setDeleting(false)
    }
  }

  async function handleStart() {
    if (template.exercises.length === 0) return
    setStarting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const session = await createSession(userId, today, template.id, template.name)
      // Pre-populate all sets from the template in parallel
      await Promise.all(
        template.exercises.flatMap(ex =>
          Array.from({ length: ex.default_sets }, (_, i) =>
            dbAddSet(
              session.id,
              ex.exercise_id,
              ex.exercise_name,
              i + 1,
              ex.default_reps,
              ex.default_weight_kg,
              ex.order_index,
            ),
          ),
        ),
      )
      onStarted(session.id, session.started_at ?? new Date().toISOString())
    } catch {
      setStarting(false)
    }
  }

  if (showExercisePicker) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0 border-b border-zinc-800">
          <h3 className="font-semibold text-zinc-100">Add exercise</h3>
          <button onClick={() => setShowExercisePicker(false)} className="text-zinc-500 hover:text-zinc-300">
            <X size={20} />
          </button>
        </div>
        <ExerciseBrowser
          actionLabel={`Add to ${template.name}`}
          onSelect={handleAddExercise}
          userId={userId}
          showFavouritesTab
        />
        {addingId && (
          <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-brand" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-zinc-800/50">
        <button onClick={onBack} className="text-zinc-400 hover:text-zinc-100 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-zinc-100 truncate">{template.name}</h2>
          {template.description && (
            <p className="text-xs text-zinc-500 truncate">{template.description}</p>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
          aria-label="Delete template"
        >
          {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
      </div>

      {/* Exercises */}
      <div className="px-4 mt-4 space-y-2">
        {template.exercises.length === 0 ? (
          <p className="text-center text-zinc-600 text-sm py-8 italic">No exercises yet — add some below</p>
        ) : (
          template.exercises.map((ex, i) => (
            <div key={ex.id} className="flex items-center gap-2 bg-zinc-900 rounded-xl px-3 py-3">
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === template.exercises.length - 1}
                  className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100 leading-snug">{ex.exercise_name}</p>
                {editingExId === ex.id ? (
                  <div className="flex items-center gap-1 mt-1" onClick={e => e.stopPropagation()}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="99"
                      value={editSets}
                      onChange={e => setEditSets(e.target.value)}
                      onBlur={() => commitEditEx(ex)}
                      onKeyDown={e => handleEditKeyDown(e, ex)}
                      autoFocus
                      className="w-10 bg-zinc-800 border border-brand rounded px-1 py-0.5 text-xs text-zinc-100 text-center focus:outline-none"
                    />
                    <span className="text-xs text-zinc-500">sets ×</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="999"
                      value={editReps}
                      onChange={e => setEditReps(e.target.value)}
                      onBlur={() => commitEditEx(ex)}
                      onKeyDown={e => handleEditKeyDown(e, ex)}
                      className="w-10 bg-zinc-800 border border-brand rounded px-1 py-0.5 text-xs text-zinc-100 text-center focus:outline-none"
                    />
                    <span className="text-xs text-zinc-500">reps</span>
                  </div>
                ) : (
                  <button
                    onClick={() => startEditEx(ex)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 mt-0.5 transition-colors underline underline-offset-2 decoration-dotted decoration-zinc-600"
                  >
                    {ex.default_sets} sets × {ex.default_reps} reps
                  </button>
                )}
              </div>

              <button
                onClick={() => handleRemoveExercise(ex)}
                className="shrink-0 p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add exercise */}
      <div className="px-4 mt-3">
        <button
          onClick={() => setShowExercisePicker(true)}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700 hover:border-brand hover:text-brand text-zinc-500 rounded-xl py-3 text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add exercise
        </button>
      </div>

      {/* Start workout */}
      <div className="px-4 mt-4">
        <button
          onClick={handleStart}
          disabled={starting || template.exercises.length === 0}
          className={`w-full flex items-center justify-center gap-2 font-semibold rounded-xl py-3 text-sm transition-colors ${
            template.exercises.length === 0
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              : 'bg-brand hover:bg-brand-dark text-zinc-900'
          }`}
        >
          {starting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Play size={16} />
          )}
          {starting ? 'Starting…' : 'Start workout'}
        </button>
        {template.exercises.length === 0 && (
          <p className="text-center text-xs text-zinc-600 mt-2">
            Add at least one exercise to start
          </p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Add-to-template sheet — shown from the Exercises tab
// ─────────────────────────────────────────────────────────────────────────────

function AddToTemplateSheet({
  exercise,
  templates,
  onClose,
}: {
  exercise: Exercise
  templates: WorkoutTemplate[]
  onClose: () => void
}) {
  const { profile } = useAuthStore()
  const unitWeight: UnitWeight = profile?.unit_weight ?? 'kg'

  // Step 1: pick a template. Step 2: configure sets/reps/weight before adding.
  const [pending, setPending] = useState<WorkoutTemplate | null>(null)
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('10')
  const [weight, setWeight] = useState('')
  const [adding, setAdding] = useState(false)
  const [done, setDone] = useState(false)

  function selectTemplate(t: WorkoutTemplate) {
    setPending(t)
    setSets('3')
    setReps('10')
    setWeight('')
    setDone(false)
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!pending) return
    const setsNum = Math.max(1, parseInt(sets, 10) || 1)
    const repsNum = Math.max(1, parseInt(reps, 10) || 1)
    const weightNum = weight.trim() ? parseFloat(weight) : null
    const weightKg =
      weightNum != null
        ? unitWeight === 'lbs'
          ? lbsToKg(weightNum)
          : weightNum
        : null

    setAdding(true)
    try {
      await addExerciseToTemplate(pending.id, exercise, 999, {
        sets: setsNum,
        reps: repsNum,
        weightKg,
      })
      setDone(true)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-[480px] bg-zinc-900 rounded-t-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {pending && !done && (
              <button
                onClick={() => setPending(null)}
                className="text-zinc-500 hover:text-zinc-300 shrink-0 -ml-1"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-zinc-100">
                {pending ? `Add to "${pending.name}"` : 'Add to template'}
              </h3>
              <p className="text-xs text-zinc-500 truncate mt-0.5">{exercise.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Step 1 — template list */}
        {!pending && (
          <div className="flex-1 overflow-y-auto py-2">
            {templates.length === 0 ? (
              <p className="text-center text-zinc-600 text-sm py-8">No templates yet — create one first</p>
            ) : (
              templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/60 transition-colors"
                >
                  <span className="text-sm text-zinc-100">{t.name}</span>
                  <ChevronLeft size={14} className="text-zinc-600 rotate-180" />
                </button>
              ))
            )}
          </div>
        )}

        {/* Step 2 — configure + confirm */}
        {pending && (
          <div className="flex-1 overflow-y-auto">
            {done ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center">
                  <Check size={22} className="text-brand" />
                </div>
                <p className="text-sm font-medium text-zinc-100">Added to {pending.name}</p>
                <button onClick={onClose} className="mt-2 text-xs text-zinc-500 underline underline-offset-2">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirm} className="px-4 py-4 space-y-4">
                {/* Sets & reps side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Sets</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="99"
                      value={sets}
                      onChange={e => setSets(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 focus:border-brand rounded-lg px-3 py-2.5 text-sm text-zinc-100 text-center focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Reps</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="999"
                      value={reps}
                      onChange={e => setReps(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 focus:border-brand rounded-lg px-3 py-2.5 text-sm text-zinc-100 text-center focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Starting weight (optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">
                    Starting weight ({unitWeight})
                    <span className="text-zinc-600 font-normal ml-1">— optional</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    placeholder="Leave blank to decide during workout"
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-brand rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={adding}
                  className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-60 text-zinc-900 font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  {adding ? 'Adding…' : 'Add to template'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates tab
// ─────────────────────────────────────────────────────────────────────────────

function TemplatesTab({
  userId,
  onOpenTemplate,
}: {
  userId: string
  onOpenTemplate: (t: TemplateWithExercises) => void
}) {
  const { openWorkout } = useActiveWorkoutStore()
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null)
  const [quickStarting, setQuickStarting] = useState(false)
  const [quickError, setQuickError] = useState<string | null>(null)

  async function handleQuickWorkout() {
    setQuickStarting(true)
    setQuickError(null)
    try {
      const today = new Date().toISOString().split('T')[0]
      const session = await createSession(userId, today, null, 'Quick Workout')
      openWorkout(session.id, session.name ?? 'Quick Workout', session.started_at ?? new Date().toISOString())
    } catch (e) {
      console.error('Failed to start quick workout:', e)
      setQuickError('Could not start workout — please try again')
      setQuickStarting(false)
    }
  }

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      setTemplates(await getTemplates(userId))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) { setFormError('Name is required'); return }
    setFormError(null)
    setCreating(true)
    try {
      await createTemplate(userId, newName, newDesc)
      setNewName('')
      setNewDesc('')
      setShowForm(false)
      await fetchTemplates()
    } catch {
      setFormError('Failed to create — please try again')
    } finally {
      setCreating(false)
    }
  }

  async function handleOpenTemplate(t: WorkoutTemplate) {
    setLoadingTemplate(t.id)
    try {
      const full = await getTemplate(t.id)
      if (full) onOpenTemplate(full)
    } finally {
      setLoadingTemplate(null)
    }
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {showForm ? (
        <form onSubmit={handleCreate} className="bg-zinc-900 rounded-2xl p-4 space-y-3">
          <h3 className="font-semibold text-zinc-100">New template</h3>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Template name"
            autoFocus
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors"
          />
          <input
            type="text"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 bg-brand hover:bg-brand-dark disabled:opacity-50 text-zinc-900 font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null) }}
              className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg py-2.5 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-zinc-900 font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            <Plus size={16} /> New template
          </button>
          <button
            onClick={handleQuickWorkout}
            disabled={quickStarting}
            className="w-full flex items-center justify-center gap-2 border border-zinc-700 hover:border-brand hover:text-brand text-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl py-3 text-sm font-medium transition-colors"
          >
            {quickStarting
              ? <><Loader2 size={16} className="animate-spin" /> Starting…</>
              : <><Zap size={16} /> Quick workout</>
            }
          </button>
          {quickError && (
            <p className="text-xs text-red-400 text-center">{quickError}</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin text-zinc-600" />
        </div>
      ) : templates.length === 0 && !showForm ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-3">
            <Dumbbell size={26} className="text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-400">No templates yet</p>
          <p className="text-xs text-zinc-600 mt-1">Create a template to plan your workouts</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => handleOpenTemplate(t)}
              className="relative bg-zinc-900 hover:bg-zinc-800 rounded-2xl p-4 text-left transition-colors"
            >
              {loadingTemplate === t.id && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-zinc-900/80">
                  <Loader2 size={20} className="animate-spin text-brand" />
                </div>
              )}
              <Dumbbell size={20} className="text-brand mb-3" />
              <p className="text-sm font-semibold text-zinc-100 leading-snug">{t.name}</p>
              {t.description && (
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{t.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercises tab — wraps ExerciseBrowser + AddToTemplate sheet
// ─────────────────────────────────────────────────────────────────────────────

function ExercisesTab({ userId }: { userId: string }) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [addSheet, setAddSheet] = useState<Exercise | null>(null)

  useEffect(() => {
    getTemplates(userId).then(setTemplates).catch(() => {})
  }, [userId])

  return (
    <div className="flex flex-col h-full">
      <ExerciseBrowser
        actionLabel="Add to template…"
        onSelect={ex => setAddSheet(ex)}
        userId={userId}
      />
      {addSheet && (
        <AddToTemplateSheet
          exercise={addSheet}
          templates={templates}
          onClose={() => setAddSheet(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'templates' | 'exercises'

export default function WorkoutsPage() {
  const { user } = useAuthStore()
  const { openWorkout } = useActiveWorkoutStore()
  const [tab, setTab] = useState<Tab>('templates')
  const [openTemplate, setOpenTemplate] = useState<TemplateWithExercises | null>(null)

  if (!user) return null

  // Template detail takes over the whole page
  if (openTemplate) {
    return (
      <div className="h-full overflow-y-auto">
        <TemplateDetail
          template={openTemplate}
          userId={user.id}
          onBack={() => setOpenTemplate(null)}
          onDeleted={() => setOpenTemplate(null)}
          onStarted={(sessionId, startedAt) => {
            openWorkout(sessionId, openTemplate.name, startedAt)
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-800 shrink-0">
        {(['templates', 'exercises'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'text-brand border-brand'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            {t === 'templates' ? 'My Templates' : 'Exercises'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'templates' ? (
          <TemplatesTab
            userId={user.id}
            onOpenTemplate={setOpenTemplate}
          />
        ) : (
          <ExercisesTab userId={user.id} />
        )}
      </div>
    </div>
  )
}
