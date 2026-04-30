import { supabase } from '@/lib/supabase'
import { addFoodLog } from '@/services/foodLogs'
import type { FoodLog, MealType, SavedMeal } from '@/types'

export async function getSavedMeals(userId: string): Promise<SavedMeal[]> {
  const { data, error } = await supabase
    .from('saved_meals')
    .select('*, items:saved_meal_items(*)')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as SavedMeal[]
}

export async function saveMeal(userId: string, name: string, foodLogs: FoodLog[]): Promise<void> {
  const { data: meal, error: mealError } = await supabase
    .from('saved_meals')
    .insert({ user_id: userId, name })
    .select()
    .single()

  if (mealError || !meal) throw mealError ?? new Error('Failed to create saved meal')

  if (foodLogs.length === 0) return

  const items = foodLogs.map(log => ({
    saved_meal_id: meal.id,
    food_name: log.food_name,
    brand: log.brand,
    barcode: log.barcode,
    calories: log.calories,
    protein_g: log.protein_g,
    carbs_g: log.carbs_g,
    fat_g: log.fat_g,
    fibre_g: log.fibre_g,
    sugar_g: log.sugar_g,
    salt_g: log.salt_g,
    serving_size_g: log.serving_size_g,
    quantity: log.quantity,
  }))

  const { error: itemsError } = await supabase.from('saved_meal_items').insert(items)
  if (itemsError) throw itemsError
}

export async function deleteSavedMeal(id: string): Promise<void> {
  const { error } = await supabase.from('saved_meals').delete().eq('id', id)
  if (error) throw error
}

export async function logSavedMeal(
  userId: string,
  date: string,
  mealType: MealType,
  savedMeal: SavedMeal,
): Promise<void> {
  for (const item of savedMeal.items) {
    await addFoodLog({
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
}
