export interface MealSection {
  items: PlanItem[]
  totals: { calories: number; protein_g: number }
}

export interface PlanResult {
  error?: string
  targets?: { calories_target: number; protein_target_g: number }
  totals?: { calories: number; protein_g: number }
  meals?: {
    breakfast: MealSection
    lunch: MealSection
    dinner: MealSection
    extras: MealSection
  }
  low_preference_match?: boolean
  auto_refreshed?: boolean
}

export interface PlanItem {
  mid: string
  name: string
  calories: number | null
  protein_g: number | null
  allergens: string[]
  nutrition_url: string
  station?: string
  meal_periods?: string[]
}

export interface Profile {
  goal: 'cutting' | 'maintaining' | 'bulking'
  height: number
  weight: number
  age: number
  sex: 'male' | 'female'
  calories: number
  name?: string
  showWorkout?: boolean
}
