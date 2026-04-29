import { useState, useCallback } from 'react'
import { X, Search, Loader2 } from 'lucide-react'
import { searchFoods, getProductServingData, offProductToFoodLog } from '@/services/openFoodFacts'
import type { FoodLog, MealType } from '@/types'

// Shape returned by the search API (flattened, no serving fields)
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

// The same product enriched with serving data fetched separately
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
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OFFSearchProduct[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // selected holds the search result merged with serving data once fetched
  const [selected, setSelected] = useState<OFFProductWithServing | null>(null)
  const [loadingServing, setLoadingServing] = useState(false)

  const [mode, setMode] = useState<QuantityMode>('grams')
  const [servings, setServings] = useState('1')
  const [grams, setGrams] = useState('100')

  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

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

    // Show the picker immediately with grams mode while serving data loads
    setSelected(product)
    setMode('grams')
    setGrams('100')
    setServings('1')
    setAddError(null)

    if (!product.code) return

    setLoadingServing(true)
    try {
      const serving = await getProductServingData(product.code)
      // Merge serving data into the selected product and switch to servings mode
      setSelected(prev => prev ? { ...prev, ...serving } : prev)
      if (serving.serving_size && serving.serving_quantity && serving.serving_quantity > 0) {
        setMode('servings')
        setServings('1')
      }
    } catch {
      // Serving fetch failed — stay in grams mode, no visible error needed
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
    kcalPer100 > 0 && effectiveG > 0
      ? Math.round((kcalPer100 * effectiveG) / 100)
      : null

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

        {/* ── Search bar ── */}
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

        {/* ── Quantity picker ── */}
        {selected && (
          <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-800 shrink-0">
            {/* Product name + serving-data loading indicator */}
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
                /* ── Servings input ── */
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
                /* ── Grams input ── */
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

            {/* Mode toggle */}
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

        {/* ── Scrollable results ── */}
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
      </div>
    </div>
  )
}
