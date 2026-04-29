// ─────────────────────────────────────────────────────────────────────────────
// Free Exercise DB  (https://github.com/yuhonas/free-exercise-db)
// Static JSON served from GitHub raw CDN — no API key required, CORS open.
// ─────────────────────────────────────────────────────────────────────────────

const DATA_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'

const IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

export interface Exercise {
  id: string
  name: string
  category: string
  equipment: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  images: string[]       // relative paths, e.g. "3_4_Sit-Up/0.jpg"
  level: string
  force: string | null
  mechanic: string | null
}

/** Map filter-pill labels → primaryMuscles values in the dataset */
export const MUSCLE_FILTERS: { label: string; muscles: string[] }[] = [
  { label: 'Chest',     muscles: ['chest'] },
  { label: 'Back',      muscles: ['lats', 'middle back', 'lower back', 'traps'] },
  { label: 'Legs',      muscles: ['quadriceps', 'hamstrings', 'calves', 'glutes', 'adductors', 'abductors'] },
  { label: 'Shoulders', muscles: ['shoulders'] },
  { label: 'Arms',      muscles: ['biceps', 'triceps', 'forearms'] },
  { label: 'Core',      muscles: ['abdominals'] },
]

export const EQUIPMENT_FILTERS = [
  { label: 'Barbell',    value: 'barbell' },
  { label: 'Dumbbell',   value: 'dumbbell' },
  { label: 'Cable',      value: 'cable' },
  { label: 'Bodyweight', value: 'body only' },
  { label: 'Machine',    value: 'machine' },
  { label: 'Kettlebell', value: 'kettlebells' },
  { label: 'Bands',      value: 'bands' },
]

/** Returns the CDN URL for an exercise image (0 = start position). */
export function exerciseImageUrl(exercise: Exercise, index = 0): string {
  const path = exercise.images[index] ?? exercise.images[0]
  if (!path) return ''
  return `${IMAGE_BASE}/${path}`
}

// ── Module-level cache so the 1 MB JSON only loads once per session ──────────
let _cache: Exercise[] | null = null
let _inflight: Promise<Exercise[]> | null = null

async function loadAll(): Promise<Exercise[]> {
  if (_cache) return _cache
  if (_inflight) return _inflight
  _inflight = fetch(DATA_URL)
    .then(r => { if (!r.ok) throw new Error('Failed to load exercise database'); return r.json() })
    .then((data: Exercise[]) => { _cache = data; _inflight = null; return data })
  return _inflight
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function searchExercises(query: string): Promise<Exercise[]> {
  const all = await loadAll()
  if (!query.trim()) return all.slice(0, 50)
  const q = query.toLowerCase()
  return all.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.primaryMuscles.some(m => m.includes(q)) ||
    e.equipment.toLowerCase().includes(q),
  )
}

export async function getExercisesByMuscle(muscles: string[]): Promise<Exercise[]> {
  const all = await loadAll()
  return all.filter(e => e.primaryMuscles.some(m => muscles.includes(m)))
}

export async function getExercisesByEquipment(equipment: string): Promise<Exercise[]> {
  const all = await loadAll()
  return all.filter(e => e.equipment === equipment)
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const all = await loadAll()
  return all.find(e => e.id === id) ?? null
}

export async function filterExercises(opts: {
  query?: string
  muscles?: string[]
  equipment?: string
}): Promise<Exercise[]> {
  const all = await loadAll()
  let results = all

  if (opts.query?.trim()) {
    const q = opts.query.toLowerCase()
    results = results.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.primaryMuscles.some(m => m.includes(q)),
    )
  }
  if (opts.muscles?.length) {
    results = results.filter(e =>
      e.primaryMuscles.some(m => opts.muscles!.includes(m)),
    )
  }
  if (opts.equipment) {
    results = results.filter(e => e.equipment === opts.equipment)
  }

  return results
}
