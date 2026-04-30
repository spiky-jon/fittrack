import { useState, useCallback } from 'react'
import { X, Search, Loader2, Bookmark, Trash2 } from 'lucide-react'
import { searchFoods, getProductServingData, offProductToFoodLog } from '@/services/openFoodFacts'
import { getSavedMeals, deleteSavedMeal } from '@/services/savedMeals'
import type { FoodLog, MealType, SavedMeal } from '@/types'

interface OFFSearchProduct {
  code?: string
  product_name?: string
  brands?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
    fiber_100g?: number
    sugars_100g?: number
    salt_100g?: number
  }
}

interface OFFProductWithServing extends OFFSearchProduct {
  serving_size?: string
  serving_quantity?: number
}

type QuantityMode = 'servings' | 'grams'

interface Props {
  mealType: MealType
  mealLabel: string
  userId: string
  date: string
  onAdd: (log: Omit<FoodLog, 'id' | 'created_at'>) => Promise<void>
  onClose: () => void
}

function hasServingData(
  p: OFFProductWithServing,
): p is OFFProductWithServing & { serving_size: string; serving_quantity: number } {
  return (
    typeof p.serving_size === 'string' &&
    p.serving_size.trim().length > 0 &&
    typeof p.serving_quantity === 'number' &&
    p.serving_quantity > 0
  )
}

export default function FoodSearchModal({
  mealType,
  mealLabel,
  userId,
  date,
  onAdd,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<'search' | 'saved'>('search')

  // ── Search tab state ──
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OFFSearchProduct[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selected, setSelected] = useState<OFFProductWithServing | null>(null)
  const [loadingServing, setLoadingServing] = useState(false)
  const [mode, setMode] = useState<QuantityMode>('grams')
  const [servings, setServings] = useState('1')
  const [grams, setGrams] = useState('100')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // ── My meals tab state ──
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [savedLoaded, setSavedLoaded] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [loggingMealId, setLoggingMealId] = useState<string | null>(null)

  // ── Search handlers ──
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    setResults([])
    setSelected(null)
    try {
      const data = await searchFoods(query.trim())
      const products: OFFSearchProduct[] = data.products ?? []
      setResults(products)
      if (products.length === 0) setSearchError('No results found — try a different term')
    } catch {
      setSearchError('Search failed — check your connection')
    } finally {
      setSearching(false)
    }
  }, [query])

  async function selectProduct(product: OFFSearchProduct | null) {
    if (!product) {
      setSelected(null)
      return
    }
    setSelected(product)
    setMode('grams')
    setGrams('100')
    setServings('1')
    setAddError(null)

    if (!product.code) return
    setLoadingServing(true)
    try {
      const serving = await getProductServingData(product.code)
      setSelected(prev => prev ? { ...prev, ...serving } : prev)
      if (serving.serving_size && serving.serving_quantity && serving.serving_quantity > 0) {
        setMode('servings')
        setServings('1')
      }
    } catch {
      // stay in grams mode
    } finally {
      setLoadingServing(false)
    }
  }

  function effectiveGrams(): number {
    if (mode === 'servings' && selected && hasServingData(selected)) {
      return parseFloat(servings || '0') * selected.serving_quantity
    }
    return parseFloat(grams || '0')
  }

  const kcalPer100 = selected?.nutriments?.['energy-kcal_100g'] ?? 0
  const effectiveG = effectiveGrams()
  const estimatedKcal =
    kcalPer100 > 0 && effectiveG > 0 ? Math.round((kcalPer100 * effectiveG) / 100) : null

  async function handleAdd() {
    if (!selected) return
    const totalGrams = effectiveGrams()
    if (!totalGrams || totalGrams <= 0) return
    setAddError(null)
    setAdding(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const log = offProductToFoodLog(selected as any, {
        userId,
        date,
        mealType,
        quantity: totalGrams / 100,
      })
      await onAdd(log)
      onClose()
    } catch {
      setAddError('Failed to save — please try again')
    } finally {
      setAdding(false)
    }
  }

  // ── Saved meals handlers ──
  async function switchToSaved() {
    setActiveTab('saved')
    if (savedLoaded) return
    setLoadingSaved(true)
    try {
      const meals = await getSavedMeals(userId)
      setSavedMeals(meals)
      setSavedLoaded(true)
    } catch {
      // silent — empty state still shows
    } finally {
      setLoadingSaved(false)
    }
  }

  async function handleLogSavedMeal(meal: SavedMeal) {
    setLoggingMealId(meal.id)
    try {
      for (const item of meal.items) {
        await onAdd({
          user_id: userId,
          date,
          meal_type: mealType,
          food_name: item.food_name,
          brand: item.brand,
          barcode: item.barcode,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          fibre_g: item.fibre_g,
          sugar_g: item.sugar_g,
          salt_g: item.salt_g,
          serving_size_g: item.serving_size_g,
          quantity: item.quantity,
        })
      }
      onClose()
    } catch {
      setLoggingMealId(null)
    }
  }

  async function handleDeleteSavedMeal(id: string) {
    try {
      await deleteSavedMeal(id)
      setSavedMeals(prev => prev.filter(m => m.id !== id))
    } finally {
      setConfirmDeleteId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] bg-zinc-900 rounded-t-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-800 shrink-0">
          <h3 className="font-semibold text-zinc-100">Add to {mealLabel}</h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex shrink-0 border-b border-zinc-800">
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
          <button
            onClick={switchToSaved}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'saved'
                ? 'text-brand border-b-2 border-brand -mb-px'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            My meals
          </button>
        </div>

        {/* ── Search tab ── */}
        {activeTab === 'search' && (
          <>
            {/* Search bar */}
            <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
              <div className="flex gap-2">
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Search foods…"
                  autoFocus
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand text-sm transition-colors"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !query.trim()}
                  className="bg-brand hover:bg-brand-dark disabled:opacity-40 text-zinc-900 rounded-lg px-3 py-2 transition-colors"
                  aria-label="Search"
                >
                  {searching
                    ? <Loader2 size={18} className="animate-spin" />
                    : <Search size={18} />}
                </button>
              </div>
            </div>

            {/* Quantity picker */}
            {selected && (
              <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm font-medium text-zinc-100 truncate flex-1">
                    {selected.product_name || 'Unknown product'}
                  </p>
                  {loadingServing && (
                    <Loader2 size={13} className="animate-spin text-zinc-500 shrink-0" />
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {mode === 'servings' && selected && hasServingData(selected) ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="number"
                        value={servings}
                        onChange={e => setServings(e.target.value)}
                        min="0.1"
                        step="0.5"
                        className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-zinc-100 text-sm focus:outline-none focus:border-brand transition-colors"
                      />
                      <span className="text-zinc-400 text-sm truncate">
                        × {selected.serving_size}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="number"
                        value={grams}
                        onChange={e => setGrams(e.target.value)}
                        min="1"
                        max="9999"
                        className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-zinc-100 text-sm focus:outline-none focus:border-brand transition-colors"
                      />
                      <span className="text-zinc-400 text-sm">g</span>
                    </div>
                  )}

                  {estimatedKcal !== null && (
                    <span className="text-zinc-400 text-sm shrink-0">≈ {estimatedKcal} kcal</span>
                  )}

                  <button
                    onClick={handleAdd}
                    disabled={adding || effectiveGrams() <= 0}
                    className="bg-brand hover:bg-brand-dark disabled:opacity-50 text-zinc-900 text-sm font-semibold rounded-lg px-4 py-1.5 transition-colors shrink-0"
                  >
                    {adding ? 'Adding…' : 'Add'}
                  </button>
                </div>

                {!loadingServing && selected && hasServingData(selected) && (
                  <button
                    onClick={() => {
                      if (mode === 'servings') {
                        const equiv = Math.round(parseFloat(servings || '1') * selected.serving_quantity)
                        setGrams(String(equiv > 0 ? equiv : 100))
                        setMode('grams')
                      } else {
                        setServings('1')
                        setMode('servings')
                      }
                    }}
                    className="mt-2 text-xs text-zinc-500 hover:text-brand transition-colors"
                  >
                    {mode === 'servings'
                      ? `Enter grams instead (1 serving = ${selected.serving_quantity}g)`
                      : 'Use servings instead'}
                  </button>
                )}

                {addError && <p className="mt-2 text-xs text-red-400">{addError}</p>}
              </div>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {searchError && (
                <p className="text-center text-zinc-500 text-sm py-8 px-4">{searchError}</p>
              )}
              {!searching && results.length === 0 && !searchError && (
                <p className="text-center text-zinc-600 text-sm py-8 px-4">
                  Search the Open Food Facts database above
                </p>
              )}
              {results.map((product, i) => {
                const kcal = product.nutriments?.['energy-kcal_100g']
                const isSelected = selected?.code === product.code && selected?.product_name === product.product_name
                return (
                  <button
                    key={product.code ?? i}
                    onClick={() => selectProduct(isSelected ? null : product)}
                    className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 transition-colors ${
                      isSelected ? 'bg-zinc-800' : 'hover:bg-zinc-800/40'
                    }`}
                  >
                    <p className="text-sm text-zinc-100 leading-snug">
                      {product.product_name || 'Unknown product'}
                    </p>
                    {product.brands && (
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">{product.brands}</p>
                    )}
                    {kcal !== undefined && (
                      <p className="text-xs text-zinc-400 mt-0.5">{Math.round(kcal)} kcal / 100g</p>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* ── My meals tab ── */}
        {activeTab === 'saved' && (
          <div className="flex-1 overflow-y-auto">
            {loadingSaved ? (
              <div className="flex justify-center py-16">
                <Loader2 size={24} className="animate-spin text-zinc-600" />
              </div>
            ) : savedMeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <Bookmark size={32} className="text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-500">
                  Save a meal after logging it to reuse it here
                </p>
              </div>
            ) : (
              savedMeals.map(meal => {
                const totalCals = meal.items.reduce((sum, item) => sum + item.calories, 0)
                const isLogging = loggingMealId === meal.id
                const confirming = confirmDeleteId === meal.id

                return (
                  <div key={meal.id} className="border-b border-zinc-800/50">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => !isLogging && !loggingMealId && handleLogSavedMeal(meal)}
                        disabled={!!loggingMealId}
                        className="flex-1 min-w-0 text-left disabled:opacity-50 transition-opacity"
                      >
                        <p className="text-sm font-medium text-zinc-100">{meal.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {meal.items.length} item{meal.items.length !== 1 ? 's' : ''} · {totalCals} kcal
                        </p>
                      </button>

                      {isLogging ? (
                        <Loader2 size={16} className="animate-spin text-zinc-500 shrink-0" />
                      ) : confirming ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-zinc-400">Delete?</span>
                          <button
                            onClick={() => handleDeleteSavedMeal(meal.id)}
                            className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(meal.id)}
                          className="shrink-0 p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                          aria-label={`Delete ${meal.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
