/** AbilityAnswer */
export interface AbilityAnswer {
  /** Questionid */
  questionId: number;
  /** Rating */
  rating: number;
}

/** AbilityAnswersRequest */
export interface AbilityAnswersRequest {
  /** Answers */
  answers: AbilityAnswer[];
  /** Subset */
  subset: string;
}

/** AbilityAssessmentResult */
export interface AbilityAssessmentResult {
  /** Results */
  results: AbilityResultItem[];
  /** Topabilities */
  topAbilities: string[];
  /** Categoryaverages */
  categoryAverages: Record<string, number>;
  /** Subset */
  subset: string;
}

/** AbilityQuestion */
export interface AbilityQuestion {
  /** Id */
  id: number;
  /** Name */
  name: string;
  /** Category */
  category: string;
  /** Description */
  description: string;
  /** Examples */
  examples: string[];
  /** Levels */
  levels: number[];
}

/** AbilityResultItem */
export interface AbilityResultItem {
  /** Name */
  name: string;
  /** Category */
  category: string;
  /** Score */
  score: number;
  /** Description */
  description: string;
}

/** AbilityScore */
export interface AbilityScore {
  /** Name */
  name: string;
  /** Rating */
  rating: number;
}

/** AnalysisRequest */
export interface AnalysisRequest {
  /** Skills */
  skills?: ScoreItem[] | null;
  /** Abilities */
  abilities?: ScoreItem[] | null;
  /** Knowledge */
  knowledge?: ScoreItem[] | null;
}

/** AnalysisResponse */
export interface AnalysisResponse {
  /** Matches */
  matches: CareerMatch[];
  /** Category */
  category: string;
}

/** Answer */
export interface Answer {
  /** Questionid */
  questionId: number;
  /** Rating */
  rating: number;
}

/** AnswersRequest */
export interface AnswersRequest {
  /** Answers */
  answers: Answer[];
}

/** AssessmentResult */
export interface AssessmentResult {
  /** Results */
  results: ResultItem[];
  /** Topcategories */
  topCategories: string[];
}

/** CareerMatch */
export interface CareerMatch {
  /** Title */
  title: string;
  /** Correlation */
  correlation: number;
}

/** CategoryContribution */
export interface CategoryContribution {
  /** Category */
  category: string;
  /** Score */
  score: number;
  /** Weight */
  weight: number;
  /** Overlap Count */
  overlap_count: number;
  /**
   * Elements Matched
   * @default []
   */
  elements_matched?: string[];
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** HealthResponse */
export interface HealthResponse {
  /** Status */
  status: string;
}

/** InterestScore */
export interface InterestScore {
  /** Name */
  name: string;
  /** Rating */
  rating: number;
}

/** KnowledgeQuestion */
export interface KnowledgeQuestion {
  /** Id */
  id: number;
  /** Name */
  name: string;
  /** Description */
  description: string;
  /** Examples */
  examples: string[];
  /** Levels */
  levels: number[];
  /** Category */
  category: string;
}

/** KnowledgeResult */
export interface KnowledgeResult {
  /** Questionid */
  questionId: number;
  /** Score */
  score: number;
  /** Name */
  name: string;
  /** Category */
  category: string;
  /** Description */
  description: string;
}

/** KnowledgeScore */
export interface KnowledgeScore {
  /** Name */
  name: string;
  /** Rating */
  rating: number;
}

/** OccupationMatch */
export interface OccupationMatch {
  /** Title */
  title: string;
  /** Correlation */
  correlation: number;
  /** Description */
  description?: string | null;
  /** Contributions */
  contributions?: CategoryContribution[] | null;
}

/** Question */
export interface Question {
  /** Id */
  id: number;
  /** Text */
  text: string;
  /** Category */
  category: string;
}

/** RecommendationResponse */
export interface RecommendationResponse {
  /** Matches */
  matches: OccupationMatch[];
  /** Category */
  category: string;
  /**
   * Methodology
   * @default "Multi-category weighted aggregation"
   */
  methodology?: string;
  /**
   * Total Occupations Analyzed
   * @default 0
   */
  total_occupations_analyzed?: number;
  /**
   * Categories Used
   * @default []
   */
  categories_used?: string[];
}

/** ResultItem */
export interface ResultItem {
  /** Category */
  category: string;
  /** Score */
  score: number;
  /** Description */
  description: string;
}

/** ScoreItem */
export interface ScoreItem {
  /** Name */
  name: string;
  /** Rating */
  rating: number;
}

/** SkillQuestion */
export interface SkillQuestion {
  /** Id */
  id: number;
  /** Name */
  name: string;
  /** Description */
  description: string;
  /** Examples */
  examples: string[];
  /** Levels */
  levels: number[];
  /** Category */
  category: string;
}

/** SkillResult */
export interface SkillResult {
  /** Questionid */
  questionId: number;
  /** Score */
  score: number;
  /** Name */
  name: string;
  /** Category */
  category: string;
  /** Description */
  description: string;
}

/** SkillScore */
export interface SkillScore {
  /** Name */
  name: string;
  /** Rating */
  rating: number;
}

/** UserAssessments */
export interface UserAssessments {
  /**
   * Interest
   * Interest assessment results
   */
  interest?: Record<string, any> | null;
  /**
   * Ability
   * Ability assessment results
   */
  ability?: Record<string, any> | null;
  /**
   * Knowledge
   * Knowledge assessment results
   */
  knowledge?: Record<string, any> | null;
  /**
   * Skills
   * Skills assessment results
   */
  skills?: Record<string, any> | null;
  /**
   * Career Recommendations
   * Career recommendations
   */
  career_recommendations?: Record<string, any> | null;
}

/** UserScores */
export interface UserScores {
  /** Abilities */
  abilities?: AbilityScore[] | null;
  /** Skills */
  skills?: SkillScore[] | null;
  /** Knowledge */
  knowledge?: KnowledgeScore[] | null;
  /** Interests */
  interests?: InterestScore[] | null;
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
}

/** CalculateResultsData */
export interface AppApisKnowledgeAssessmentApiCalculateResultsData {
  /** Results */
  results: KnowledgeResult[];
}

/** CalculateResultsData */
export interface AppApisSkillsAssessmentApiCalculateResultsData {
  /** Results */
  results: SkillResult[];
}

export type CheckHealthData = HealthResponse;

/** Response Get Knowledge Questions */
export type GetKnowledgeQuestionsData = KnowledgeQuestion[];

export type CalculateKnowledgeResultsData = AppApisKnowledgeAssessmentApiCalculateResultsData;

export type CalculateKnowledgeResultsError = HTTPValidationError;

/** Response Get Skill Questions */
export type GetSkillQuestionsData = SkillQuestion[];

export type CalculateSkillResultsData = AppApisSkillsAssessmentApiCalculateResultsData;

export type CalculateSkillResultsError = HTTPValidationError;

export type AnalyzeAssessmentResultsData = AnalysisResponse;

export type AnalyzeAssessmentResultsError = HTTPValidationError;

export type AnalyzeResultsData = RecommendationResponse;

export type AnalyzeResultsError = HTTPValidationError;

export type AnalyzeMultiCategoryData = RecommendationResponse;

export type AnalyzeMultiCategoryError = HTTPValidationError;

export interface GetUserAssessmentsParams {
  /** User Id */
  userId: string;
}

export type GetUserAssessmentsData = UserAssessments;

export type GetUserAssessmentsError = HTTPValidationError;

/** Response Get Ability Questions */
export type GetAbilityQuestionsData = AbilityQuestion[];

export type CalculateAbilityResultsData = AbilityAssessmentResult;

export type CalculateAbilityResultsError = HTTPValidationError;

/** Response Get Questions */
export type GetQuestionsData = Question[];

export type CalculateResultsData = AssessmentResult;

export type CalculateResultsError = HTTPValidationError;
