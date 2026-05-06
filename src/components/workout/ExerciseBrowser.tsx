import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, ChevronLeft, Heart } from 'lucide-react'
import {
  filterExercises, exerciseImageUrl, getExercise,
  MUSCLE_FILTERS, EQUIPMENT_FILTERS,
  type Exercise,
} from '@/services/exerciseDb'
import { useFavouriteExercises } from '@/hooks/useFavouriteExercises'

// ── Pill filter button ────────────────────────────────────────────────────────

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active ? 'bg-brand text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  )
}

// ── Exercise card — two sibling buttons inside a styled div ───────────────────

function ExerciseCard({
  exercise,
  onSelect,
  onToggleFavourite,
  isFavourited,
  showHeart,
}: {
  exercise: Exercise
  onSelect: () => void
  onToggleFavourite?: () => void
  isFavourited?: boolean
  showHeart?: boolean
}) {
  return (
    <div className="flex items-center bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors">
      <button
        className="flex items-center gap-3 flex-1 min-w-0 p-3 text-left"
        onClick={onSelect}
      >
        {exercise.images.length > 0 && (
          <img
            src={exerciseImageUrl(exercise)}
            alt=""
            className="w-12 h-12 rounded-lg object-cover shrink-0 bg-zinc-800"
            loading="lazy"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-100 leading-snug">{exercise.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5 capitalize">
            {exercise.primaryMuscles[0]} · {exercise.equipment}
          </p>
        </div>
      </button>
      {showHeart && onToggleFavourite && (
        <button
          onClick={onToggleFavourite}
          className="shrink-0 px-3 py-4 transition-colors"
          aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Heart
            size={16}
            className={
              isFavourited
                ? 'fill-brand text-brand'
                : 'text-zinc-600 hover:text-zinc-400'
            }
          />
        </button>
      )}
    </div>
  )
}

// ── Exercise detail ───────────────────────────────────────────────────────────

function ExerciseDetail({
  exercise,
  actionLabel,
  onAction,
  onBack,
  isFavourited,
  onToggleFavourite,
  showHeart,
}: {
  exercise: Exercise
  actionLabel?: string
  onAction: () => void
  onBack: () => void
  isFavourited?: boolean
  onToggleFavourite?: () => void
  showHeart?: boolean
}) {
  const [imgIndex, setImgIndex] = useState(0)

  useEffect(() => {
    if (exercise.images.length < 2) return
    const t = setInterval(() => setImgIndex(i => (i + 1) % 2), 1200)
    return () => clearInterval(t)
  }, [exercise.images.length])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>
        {showHeart && onToggleFavourite && (
          <button
            onClick={onToggleFavourite}
            className="p-1.5 transition-colors"
            aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Heart
              size={20}
              className={isFavourited ? 'fill-brand text-brand' : 'text-zinc-600 hover:text-zinc-400'}
            />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {exercise.images.length > 0 && (
          <div className="rounded-2xl overflow-hidden bg-zinc-900">
            <img
              src={exerciseImageUrl(exercise, imgIndex)}
              alt={exercise.name}
              className="h-48 w-full object-cover"
            />
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold text-zinc-100">{exercise.name}</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {exercise.primaryMuscles.map(m => (
              <span key={m} className="text-xs bg-zinc-800 text-zinc-300 rounded-full px-2.5 py-1 capitalize">
                {m}
              </span>
            ))}
            <span className="text-xs bg-zinc-800 text-zinc-500 rounded-full px-2.5 py-1 capitalize">
              {exercise.equipment}
            </span>
            <span className="text-xs bg-zinc-800 text-zinc-500 rounded-full px-2.5 py-1 capitalize">
              {exercise.level}
            </span>
          </div>
        </div>

        {exercise.instructions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Instructions</p>
            <ol className="space-y-2">
              {exercise.instructions.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-300">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-500 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {actionLabel && (
        <div className="px-4 py-3 border-t border-zinc-800 shrink-0">
          <button
            onClick={onAction}
            className="w-full bg-brand hover:bg-brand-dark text-zinc-900 font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Exercise browser ──────────────────────────────────────────────────────────

export interface ExerciseBrowserProps {
  onSelect: (exercise: Exercise) => void
  actionLabel?: string
  userId?: string
  /** If true, adds a Favourites/Search tab bar — use for slide-up pickers */
  showFavouritesTab?: boolean
}

export default function ExerciseBrowser({
  onSelect,
  actionLabel,
  userId,
  showFavouritesTab,
}: ExerciseBrowserProps) {
  const { favouriteIds, favourites, toggleFavourite } = useFavouriteExercises(userId ?? '')

  // Search/filter state
  const [query, setQuery] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null)
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null)
  const [results, setResults] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<Exercise | null>(null)

  // Favourites filter pill (filter mode only, not tab mode)
  const [showFavouritesFilter, setShowFavouritesFilter] = useState(false)

  // Tab bar (tab mode only)
  const [activeTab, setActiveTab] = useState<'favourites' | 'search'>(
    showFavouritesTab ? 'favourites' : 'search',
  )

  // Full Exercise objects for the favourites list
  const [favExercises, setFavExercises] = useState<Exercise[]>([])
  const [loadingFavs, setLoadingFavs] = useState(false)

  useEffect(() => {
    if (!userId || favourites.length === 0) { setFavExercises([]); return }
    setLoadingFavs(true)
    Promise.all(favourites.map(f => getExercise(f.exercise_id)))
      .then(resolved => setFavExercises(resolved.filter((e): e is Exercise => e !== null)))
      .catch(() => {})
      .finally(() => setLoadingFavs(false))
  }, [favourites, userId])

  const runFilter = useCallback(async () => {
    setLoading(true)
    try {
      const muscles = muscleFilter
        ? MUSCLE_FILTERS.find(f => f.label === muscleFilter)?.muscles
        : undefined
      const res = await filterExercises({
        query: query || undefined,
        muscles,
        equipment: equipmentFilter ?? undefined,
      })
      setResults(res.slice(0, 80))
    } finally {
      setLoading(false)
    }
  }, [query, muscleFilter, equipmentFilter])

  useEffect(() => {
    const t = setTimeout(runFilter, 250)
    return () => clearTimeout(t)
  }, [runFilter])

  // ── Detail view ──────────────────────────────────────────────────────────────

  if (detail) {
    return (
      <ExerciseDetail
        exercise={detail}
        actionLabel={actionLabel}
        onAction={() => { onSelect(detail); setDetail(null) }}
        onBack={() => setDetail(null)}
        isFavourited={favouriteIds.has(detail.id)}
        onToggleFavourite={() => toggleFavourite(detail)}
        showHeart={!!userId}
      />
    )
  }

  // ── Shared favourites list content ───────────────────────────────────────────

  const FavouritesList = (
    <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
      {loadingFavs ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin text-zinc-600" />
        </div>
      ) : favExercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Heart size={32} className="text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">
            No favourites yet — tap the heart on any exercise to save it
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {favExercises.map(ex => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              onSelect={() => setDetail(ex)}
              onToggleFavourite={() => toggleFavourite(ex)}
              isFavourited={favouriteIds.has(ex.id)}
              showHeart={!!userId}
            />
          ))}
        </div>
      )}
    </div>
  )

  // ── Tab mode layout ──────────────────────────────────────────────────────────

  if (showFavouritesTab) {
    return (
      <div className="flex flex-col h-full">
        {/* Tab bar */}
        <div className="flex shrink-0 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('favourites')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'favourites'
                ? 'text-brand border-b-2 border-brand -mb-px'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Favourites{favourites.length > 0 ? ` (${favourites.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'search'
                ? 'text-brand border-b-2 border-brand -mb-px'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Search
          </button>
        </div>

        {activeTab === 'favourites' ? FavouritesList : (
          <>
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search exercises…"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-2 px-4 py-2 overflow-x-auto shrink-0 scrollbar-none">
              <Pill label="All" active={muscleFilter === null} onClick={() => setMuscleFilter(null)} />
              {MUSCLE_FILTERS.map(f => (
                <Pill
                  key={f.label}
                  label={f.label}
                  active={muscleFilter === f.label}
                  onClick={() => setMuscleFilter(muscleFilter === f.label ? null : f.label)}
                />
              ))}
            </div>
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto shrink-0 scrollbar-none">
              <Pill label="Any equipment" active={equipmentFilter === null} onClick={() => setEquipmentFilter(null)} />
              {EQUIPMENT_FILTERS.map(f => (
                <Pill
                  key={f.value}
                  label={f.label}
                  active={equipmentFilter === f.value}
                  onClick={() => setEquipmentFilter(equipmentFilter === f.value ? null : f.value)}
                />
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-zinc-600" />
                </div>
              ) : results.length === 0 ? (
                <p className="text-center text-zinc-600 text-sm py-10">No exercises found</p>
              ) : (
                <div className="space-y-2">
                  {results.map(ex => (
                    <ExerciseCard
                      key={ex.id}
                      exercise={ex}
                      onSelect={() => setDetail(ex)}
                      onToggleFavourite={() => toggleFavourite(ex)}
                      isFavourited={favouriteIds.has(ex.id)}
                      showHeart={!!userId}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Filter mode layout (Exercises tab) ───────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search exercises…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors"
          />
        </div>
      </div>

      {/* Muscle filters + Favourites pill */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto shrink-0 scrollbar-none">
        {userId && (
          <Pill
            label={favourites.length > 0 ? `Favourites (${favourites.length})` : 'Favourites'}
            active={showFavouritesFilter}
            onClick={() => {
              setShowFavouritesFilter(f => !f)
              setMuscleFilter(null)
            }}
          />
        )}
        <Pill
          label="All"
          active={muscleFilter === null && !showFavouritesFilter}
          onClick={() => { setMuscleFilter(null); setShowFavouritesFilter(false) }}
        />
        {MUSCLE_FILTERS.map(f => (
          <Pill
            key={f.label}
            label={f.label}
            active={muscleFilter === f.label}
            onClick={() => {
              setMuscleFilter(muscleFilter === f.label ? null : f.label)
              setShowFavouritesFilter(false)
            }}
          />
        ))}
      </div>

      <div className="flex gap-2 px-4 pb-3 overflow-x-auto shrink-0 scrollbar-none">
        <Pill label="Any equipment" active={equipmentFilter === null} onClick={() => setEquipmentFilter(null)} />
        {EQUIPMENT_FILTERS.map(f => (
          <Pill
            key={f.value}
            label={f.label}
            active={equipmentFilter === f.value}
            onClick={() => setEquipmentFilter(equipmentFilter === f.value ? null : f.value)}
          />
        ))}
      </div>

      {/* Results — favourites list or search results */}
      {showFavouritesFilter ? FavouritesList : (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-zinc-600" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-zinc-600 text-sm py-10">No exercises found</p>
          ) : (
            <div className="space-y-2">
              {results.map(ex => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  onSelect={() => setDetail(ex)}
                  onToggleFavourite={() => toggleFavourite(ex)}
                  isFavourited={favouriteIds.has(ex.id)}
                  showHeart={!!userId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
