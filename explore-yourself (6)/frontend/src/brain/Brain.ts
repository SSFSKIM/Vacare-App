import {
  AbilityAnswersRequest,
  AnalysisRequest,
  AnalyzeAssessmentResultsData,
  AnalyzeAssessmentResultsError,
  AnalyzeMultiCategoryData,
  AnalyzeMultiCategoryError,
  AnalyzeResultsData,
  AnalyzeResultsError,
  AnswersRequest,
  CalculateAbilityResultsData,
  CalculateAbilityResultsError,
  CalculateKnowledgeResultsData,
  CalculateKnowledgeResultsError,
  CalculateResultsData,
  CalculateResultsError,
  CalculateSkillResultsData,
  CalculateSkillResultsError,
  CalibrateData,
  CalibrateError,
  CalibrateScoresData,
  CalibrateScoresError,
  CalibrationRequest,
  CheckHealthData,
  GetAbilityQuestionsData,
  GetCalibrationData,
  GetKnowledgeQuestionsData,
  GetQuestionsData,
  GetSkillQuestionsData,
  GetUserAssessmentsData,
  GetUserAssessmentsError,
  GetUserAssessmentsParams,
  OptimizationRequest,
  OptimizeWeightsData,
  OptimizeWeightsError,
  ScoreCalibrationRequest,
  UserScores,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Brain<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   *
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  check_health = (params: RequestParams = {}) =>
    this.request<CheckHealthData, any>({
      path: `/_healthz`,
      method: "GET",
      ...params,
    });

  /**
   * @description Get all knowledge assessment questions
   *
   * @tags dbtn/module:knowledge_assessment_api, dbtn/hasAuth
   * @name get_knowledge_questions
   * @summary Get Knowledge Questions
   * @request GET:/routes/get_knowledge_questions
   */
  get_knowledge_questions = (params: RequestParams = {}) =>
    this.request<GetKnowledgeQuestionsData, any>({
      path: `/routes/get_knowledge_questions`,
      method: "GET",
      ...params,
    });

  /**
   * @description Calculate knowledge assessment results based on answers
   *
   * @tags dbtn/module:knowledge_assessment_api, dbtn/hasAuth
   * @name calculate_knowledge_results
   * @summary Calculate Knowledge Results
   * @request POST:/routes/calculate_knowledge_results
   */
  calculate_knowledge_results = (data: AnswersRequest, params: RequestParams = {}) =>
    this.request<CalculateKnowledgeResultsData, CalculateKnowledgeResultsError>({
      path: `/routes/calculate_knowledge_results`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Get all skill assessment questions
   *
   * @tags dbtn/module:skills_assessment_api, dbtn/hasAuth
   * @name get_skill_questions
   * @summary Get Skill Questions
   * @request GET:/routes/get_skill_questions
   */
  get_skill_questions = (params: RequestParams = {}) =>
    this.request<GetSkillQuestionsData, any>({
      path: `/routes/get_skill_questions`,
      method: "GET",
      ...params,
    });

  /**
   * @description Calculate skill assessment results based on answers
   *
   * @tags dbtn/module:skills_assessment_api, dbtn/hasAuth
   * @name calculate_skill_results
   * @summary Calculate Skill Results
   * @request POST:/routes/calculate_skill_results
   */
  calculate_skill_results = (data: AnswersRequest, params: RequestParams = {}) =>
    this.request<CalculateSkillResultsData, CalculateSkillResultsError>({
      path: `/routes/calculate_skill_results`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Analyze user assessment results and recommend matching occupations
   *
   * @tags dbtn/module:analyze_results, dbtn/hasAuth
   * @name analyze_assessment_results
   * @summary Analyze Assessment Results
   * @request POST:/routes/analyze-results
   */
  analyze_assessment_results = (data: AnalysisRequest, params: RequestParams = {}) =>
    this.request<AnalyzeAssessmentResultsData, AnalyzeAssessmentResultsError>({
      path: `/routes/analyze-results`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Retrieves all assessment results for a given user from Firestore. This includes interest, ability, knowledge, skills, and career recommendations. The data is intended for use by an n8n workflow to generate a comprehensive report.
   *
   * @tags dbtn/module:user_data
   * @name get_user_assessments
   * @summary Get User Assessments
   * @request GET:/routes/user-assessments/{user_id}
   */
  get_user_assessments = ({ userId, ...query }: GetUserAssessmentsParams, params: RequestParams = {}) =>
    this.request<GetUserAssessmentsData, GetUserAssessmentsError>({
      path: `/routes/user-assessments/${userId}`,
      method: "GET",
      ...params,
    });

  /**
   * @description Get all ability assessment questions
   *
   * @tags dbtn/module:assessment_api, dbtn/hasAuth
   * @name get_ability_questions
   * @summary Get Ability Questions
   * @request GET:/routes/ability-questions
   */
  get_ability_questions = (params: RequestParams = {}) =>
    this.request<GetAbilityQuestionsData, any>({
      path: `/routes/ability-questions`,
      method: "GET",
      ...params,
    });

  /**
   * @description Calculate ability assessment results based on answers
   *
   * @tags dbtn/module:assessment_api, dbtn/hasAuth
   * @name calculate_ability_results
   * @summary Calculate Ability Results
   * @request POST:/routes/calculate-ability-results
   */
  calculate_ability_results = (data: AbilityAnswersRequest, params: RequestParams = {}) =>
    this.request<CalculateAbilityResultsData, CalculateAbilityResultsError>({
      path: `/routes/calculate-ability-results`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Get all assessment questions
   *
   * @tags dbtn/module:assessment_api, dbtn/hasAuth
   * @name get_questions
   * @summary Get Questions
   * @request GET:/routes/questions
   */
  get_questions = (params: RequestParams = {}) =>
    this.request<GetQuestionsData, any>({
      path: `/routes/questions`,
      method: "GET",
      ...params,
    });

  /**
   * @description Calculate assessment results based on answers
   *
   * @tags dbtn/module:assessment_api, dbtn/hasAuth
   * @name calculate_results
   * @summary Calculate Results
   * @request POST:/routes/calculate-results
   */
  calculate_results = (data: AnswersRequest, params: RequestParams = {}) =>
    this.request<CalculateResultsData, CalculateResultsError>({
      path: `/routes/calculate-results`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Original single-category endpoint (backward compatibility)
   *
   * @tags dbtn/module:career_recommendation, dbtn/hasAuth
   * @name analyze_results
   * @summary Analyze Results
   * @request POST:/routes/career-recommendation/analyze
   */
  analyze_results = (data: UserScores, params: RequestParams = {}) =>
    this.request<AnalyzeResultsData, AnalyzeResultsError>({
      path: `/routes/career-recommendation/analyze`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Return the current calibration values and a small sample of rules.
   *
   * @tags dbtn/module:career_recommendation, dbtn/hasAuth
   * @name get_calibration
   * @summary Get Calibration
   * @request GET:/routes/career-recommendation/calibration
   */
  get_calibration = (params: RequestParams = {}) =>
    this.request<GetCalibrationData, any>({
      path: `/routes/career-recommendation/calibration`,
      method: "GET",
      ...params,
    });

  /**
   * @description Re-run calibration using live O*NET frames from Databutton storage.
   *
   * @tags dbtn/module:career_recommendation, dbtn/hasAuth
   * @name calibrate
   * @summary Calibrate
   * @request POST:/routes/career-recommendation/calibrate
   */
  calibrate = (data: CalibrationRequest, params: RequestParams = {}) =>
    this.request<CalibrateData, CalibrateError>({
      path: `/routes/career-recommendation/calibrate`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags dbtn/module:career_recommendation, dbtn/hasAuth
   * @name optimize_weights
   * @summary Optimize Weights
   * @request POST:/routes/career-recommendation/optimize-weights
   */
  optimize_weights = (data: OptimizationRequest, params: RequestParams = {}) =>
    this.request<OptimizeWeightsData, OptimizeWeightsError>({
      path: `/routes/career-recommendation/optimize-weights`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags dbtn/module:career_recommendation, dbtn/hasAuth
   * @name calibrate_scores
   * @summary Calibrate Scores
   * @request POST:/routes/career-recommendation/calibrate-scores
   */
  calibrate_scores = (data: ScoreCalibrationRequest, params: RequestParams = {}) =>
    this.request<CalibrateScoresData, CalibrateScoresError>({
      path: `/routes/career-recommendation/calibrate-scores`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description New multi-category weighted aggregation endpoint
   *
   * @tags dbtn/module:career_recommendation, dbtn/hasAuth
   * @name analyze_multi_category
   * @summary Analyze Multi Category
   * @request POST:/routes/career-recommendation/analyze-multi
   */
  analyze_multi_category = (data: UserScores, params: RequestParams = {}) =>
    this.request<AnalyzeMultiCategoryData, AnalyzeMultiCategoryError>({
      path: `/routes/career-recommendation/analyze-multi`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
}
