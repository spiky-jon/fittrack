// ============================================
// Open Food Facts API Service
// Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
// Free to use — no API key required
// ============================================

import type { OFFProduct, FoodLog, MealType } from '@/types'

export async function searchFoods(query: string, page = 1) {
  const params = new URLSearchParams({ q: query, page: String(page) })
  const res = await fetch(`/api/food-search?${params}`)
  if (!res.ok) throw new Error(`OFF search error: ${res.status}`)
  const data = await res.json()
  const products = data.products ?? []
  return { products, count: data.count ?? products.length }
}

export async function getProductServingData(
  code: string,
): Promise<{ serving_size?: string; serving_quantity?: number }> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${code}?fields=serving_size,serving_quantity`,
    { headers: { 'User-Agent': 'FitTrack/1.0 (https://fittrack-eight-liart.vercel.app)' } },
  )
  if (!res.ok) return {}
  const data = await res.json()
  if (data.status !== 1) return {}
  const p = data.product ?? {}
  return {
    serving_size: typeof p.serving_size === 'string' ? p.serving_size : undefined,
    serving_quantity: typeof p.serving_quantity === 'number' ? p.serving_quantity : undefined,
  }
}

// Lookup by barcode
export async function getFoodByBarcode(barcode: string): Promise<OFFProduct> {
  const res = await fetch(`/api/food-barcode?barcode=${barcode}`)
  if (!res.ok) throw new Error('Product not found')
  const data = await res.json()
  if (data.status === 0) throw new Error('Product not found in Open Food Facts')
  return data
}

// Convert an OFF product into a FoodLog row (ready to save)
export function offProductToFoodLog(
  product: OFFProduct['product'],
  opts: {
    userId: string
    date: string
    mealType: MealType
    quantity: number
    barcode?: string
  }
): Omit<FoodLog, 'id' | 'created_at'> {
  const n = product.nutriments
  const perHundred = (val: number | undefined) => (val ?? 0)
  const scale = opts.quantity  // quantity = number of 100g servings, or number of "servings"

  return {
    user_id: opts.userId,
    date: opts.date,
    meal_type: opts.mealType,
    food_name: product.product_name || 'Unknown product',
    brand: product.brands || null,
    barcode: opts.barcode ?? null,
    calories: Math.round(perHundred(n['energy-kcal_100g']) * scale),
    protein_g: perHundred(n.proteins_100g) * scale,
    carbs_g: perHundred(n.carbohydrates_100g) * scale,
    fat_g: perHundred(n.fat_100g) * scale,
    fibre_g: perHundred(n.fiber_100g) * scale,
    sugar_g: perHundred(n.sugars_100g) * scale,
    salt_g: perHundred(n.salt_100g) * scale,
    serving_size_g: null,
    quantity: opts.quantity,
  }
}
