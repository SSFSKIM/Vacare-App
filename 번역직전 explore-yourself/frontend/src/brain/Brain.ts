import {
  AbilityAnswersRequest,
  AnalysisRequest,
  AnalyzeAssessmentResultsData,
  AnalyzeAssessmentResultsError,
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
  CheckHealthData,
  GetAbilityQuestionsData,
  GetKnowledgeQuestionsData,
  GetQuestionsData,
  GetSkillQuestionsData,
  TranslateTextData,
  TranslateTextError,
  TranslationRequest,
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
   * @description Analyze user assessment results and recommend matching occupations
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
   * @description Translates the given text to the target language using OpenAI.
   *
   * @tags dbtn/module:translate, dbtn/hasAuth
   * @name translate_text
   * @summary Translate Text
   * @request POST:/routes/translate
   */
  translate_text = (data: TranslationRequest, params: RequestParams = {}) =>
    this.request<TranslateTextData, TranslateTextError>({
      path: `/routes/translate`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
}
