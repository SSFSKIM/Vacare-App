export interface ApiQuestion {
  id: number
  name: string
  description: string
  levels: Array<string | number>
  examples: string[]
  category?: string
}

export interface KnowledgeQuestion extends ApiQuestion {}

export interface AbilityQuestion extends ApiQuestion {}

export interface SkillQuestion extends ApiQuestion {}

export interface KnowledgeTestResult {
  subset: string
  name: string
  score: number
  description?: string
}

export interface AbilityTestResult {
  subset: string
  name: string
  score: number
  description?: string
  category?: string
}

export interface SkillTestResult {
  subset: string
  name: string
  score: number
  description?: string
}

export interface CareerRecommendationMatch {
  title: string
  description?: string
  correlation?: number
}

export interface ProfileData {
  dob: string
  gender: string
  education: string
  grade: string
}
