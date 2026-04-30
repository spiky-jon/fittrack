// ============================================
// Database row types (mirrors Supabase schema)
// ============================================

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks'
export type UnitWeight = 'kg' | 'lbs'
export type UnitHeight = 'cm' | 'ft_in'
export type UnitEnergy = 'kcal' | 'kj'

export interface Profile {
  id: string
  name: string | null
  dob: string | null
  height_cm: number | null
  goal_weight_kg: number | null
  calorie_goal: number
  protein_goal_g: number
  carbs_goal_g: number
  fat_goal_g: number
  unit_weight: UnitWeight
  unit_height: UnitHeight
  unit_energy: UnitEnergy
  week_start: 'monday' | 'sunday'
  created_at: string
  updated_at: string
}

export interface FoodLog {
  id: string
  user_id: string
  date: string           // YYYY-MM-DD
  meal_type: MealType
  food_name: string
  brand: string | null
  barcode: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fibre_g: number
  sugar_g: number
  salt_g: number
  serving_size_g: number | null
  quantity: number
  created_at: string
}

export interface WeightLog {
  id: string
  user_id: string
  date: string
  weight_kg: number
  notes: string | null
  created_at: string
}

export interface WorkoutTemplate {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  exercises?: TemplateExercise[]
}

export interface TemplateExercise {
  id: string
  template_id: string
  exercise_id: string
  exercise_name: string
  order_index: number
  default_sets: number
  default_reps: number
  default_weight_kg: number | null
}

export interface WorkoutSession {
  id: string
  user_id: string
  template_id: string | null
  date: string
  name: string | null
  started_at: string | null
  ended_at: string | null
  notes: string | null
  created_at: string
  sets?: ExerciseSet[]
}

export interface ExerciseSet {
  id: string
  session_id: string
  exercise_id: string
  exercise_name: string
  exercise_order_index?: number
  set_number: number
  reps: number | null
  weight_kg: number | null
  completed: boolean
}

// ============================================
// Open Food Facts API types
// ============================================

export interface OFFProduct {
  code: string
  product: {
    product_name: string
    brands: string
    serving_size: string
    nutriments: {
      'energy-kcal_100g': number
      'energy-kcal_serving': number
      proteins_100g: number
      carbohydrates_100g: number
      fat_100g: number
      fiber_100g: number
      sugars_100g: number
      salt_100g: number
    }
    image_front_small_url: string
  }
  status: number
}

export interface OFFSearchResult {
  products: OFFProduct['product'][]
  count: number
  page_size: number
}

// ============================================
// Saved Meals
// ============================================

export interface SavedMealItem {
  id: string
  saved_meal_id: string
  food_name: string
  brand: string | null
  barcode: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fibre_g: number
  sugar_g: number
  salt_g: number
  serving_size_g: number | null
  quantity: number
}

export interface SavedMeal {
  id: string
  user_id: string
  name: string
  created_at: string
  items: SavedMealItem[]
}

// ============================================
// App UI types
// ============================================

export interface DailyNutrition {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface DailyLog {
  date: string
  meals: Record<MealType, FoodLog[]>
  totals: DailyNutrition
}

// Supabase Database type (used by supabase client)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      food_logs: { Row: FoodLog; Insert: Omit<FoodLog, 'id' | 'created_at'>; Update: Partial<FoodLog> }
      weight_logs: { Row: WeightLog; Insert: Omit<WeightLog, 'id' | 'created_at'>; Update: Partial<WeightLog> }
      workout_templates: { Row: WorkoutTemplate; Insert: Omit<WorkoutTemplate, 'id' | 'created_at' | 'updated_at'>; Update: Partial<WorkoutTemplate> }
      template_exercises: { Row: TemplateExercise; Insert: Omit<TemplateExercise, 'id'>; Update: Partial<TemplateExercise> }
      workout_sessions: { Row: WorkoutSession; Insert: Omit<WorkoutSession, 'id' | 'created_at'>; Update: Partial<WorkoutSession> }
      exercise_sets: { Row: ExerciseSet; Insert: Omit<ExerciseSet, 'id'>; Update: Partial<ExerciseSet> }
    }
  }
}
