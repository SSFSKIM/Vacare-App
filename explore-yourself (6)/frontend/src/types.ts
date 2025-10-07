export interface BaseQuestion {
  id: number
  name: string
  description: string
  examples: string[]
  levels: Array<string | number>
  category?: string
}

export interface KnowledgeQuestion extends BaseQuestion {}

export interface AbilityQuestion extends BaseQuestion {}

export interface SkillQuestion extends BaseQuestion {}

export interface Answer {
  questionId: number
  rating: number
}

export interface AbilityAnswer extends Answer {
  questionId: number
}

export interface AssessmentResult {
  category: string
  score: number
  description?: string
  name?: string
}

interface BaseSubsetResult {
  name: string
  score: number
  subset: string
  description?: string
  category?: string
}

export interface AbilitySubsetResult extends BaseSubsetResult {}

export interface KnowledgeSubsetResult extends BaseSubsetResult {}

export interface SkillSubsetResult extends BaseSubsetResult {}

export interface AbilityTestResult {
  subset: string
  results: AbilitySubsetResult[]
  topAbilities?: string[]
  categoryAverages?: Record<string, number>
}

export interface KnowledgeTestResult {
  subset?: string
  results: KnowledgeSubsetResult[]
}

export interface SkillTestResult {
  subset?: string
  results: SkillSubsetResult[]
}

export interface CareerRecommendationMatch {
  title: string
  onet_code?: string | null
  description?: string | null
  correlation?: number | null
  contributions?: Array<{
    category: string
    score: number
    weight?: number
    overlapCount?: number
    elementsMatched?: string[]
  }>
}

export interface CareerRecommendations {
  matches: CareerRecommendationMatch[]
  category?: string | null
  methodology?: string | null
  totalOccupationsAnalyzed?: number | null
  categoriesUsed?: string[]
}

export interface ProfileData {
  dob: string
  gender: string
  education: string
  grade: string
}

export interface UserProfile {
  displayName: string | null
  email: string | null
  photoURL: string | null
  createdAt: number
  lastLogin: number
  profile?: ProfileData
}

export interface InterestAssessment {
  answers: Answer[]
  currentQuestionIndex: number
  results: AssessmentResult[]
}

export interface AbilityAssessment {
  answers: AbilityAnswer[]
  currentQuestionIndex: number
  results: AbilitySubsetResult[]
}

export interface KnowledgeAssessment {
  answers: Answer[]
  results: KnowledgeSubsetResult[]
}

export interface SkillAssessment {
  answers: Answer[]
  results: SkillSubsetResult[]
}

export interface AssessmentData {
  userId: string
  interest: InterestAssessment
  ability: AbilityAssessment
  knowledge: KnowledgeAssessment
  skills: SkillAssessment
  careerRecommendations: CareerRecommendations | null
  lastUpdated: number
  profile?: ProfileData
}

export interface AssessmentResultsSummary {
  interest: AssessmentResult[]
  ability: AbilitySubsetResult[]
  knowledge: KnowledgeSubsetResult[]
  skills: SkillSubsetResult[]
  careerRecommendations: CareerRecommendations | null
}
