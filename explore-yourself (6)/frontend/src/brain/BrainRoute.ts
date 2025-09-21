import {
  AbilityAnswersRequest,
  AnalysisRequest,
  AnalyzeAssessmentResultsData,
  AnalyzeMultiCategoryData,
  AnalyzeResultsData,
  AnswersRequest,
  CalculateAbilityResultsData,
  CalculateKnowledgeResultsData,
  CalculateResultsData,
  CalculateSkillResultsData,
  CalibrateData,
  CalibrateScoresData,
  CalibrationRequest,
  CheckHealthData,
  GetAbilityQuestionsData,
  GetCalibrationData,
  GetKnowledgeQuestionsData,
  GetQuestionsData,
  GetSkillQuestionsData,
  GetUserAssessmentsData,
  OptimizationRequest,
  OptimizeWeightsData,
  ScoreCalibrationRequest,
  UserScores,
} from "./data-contracts";

export namespace Brain {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  export namespace check_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckHealthData;
  }

  /**
   * @description Get all knowledge assessment questions
   * @tags dbtn/module:knowledge_assessment_api, dbtn/hasAuth
   * @name get_knowledge_questions
   * @summary Get Knowledge Questions
   * @request GET:/routes/get_knowledge_questions
   */
  export namespace get_knowledge_questions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetKnowledgeQuestionsData;
  }

  /**
   * @description Calculate knowledge assessment results based on answers
   * @tags dbtn/module:knowledge_assessment_api, dbtn/hasAuth
   * @name calculate_knowledge_results
   * @summary Calculate Knowledge Results
   * @request POST:/routes/calculate_knowledge_results
   */
  export namespace calculate_knowledge_results {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AnswersRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CalculateKnowledgeResultsData;
  }

  /**
   * @description Get all skill assessment questions
   * @tags dbtn/module:skills_assessment_api, dbtn/hasAuth
   * @name get_skill_questions
   * @summary Get Skill Questions
   * @request GET:/routes/get_skill_questions
   */
  export namespace get_skill_questions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetSkillQuestionsData;
  }

  /**
   * @description Calculate skill assessment results based on answers
   * @tags dbtn/module:skills_assessment_api, dbtn/hasAuth
   * @name calculate_skill_results
   * @summary Calculate Skill Results
   * @request POST:/routes/calculate_skill_results
   */
  export namespace calculate_skill_results {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AnswersRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CalculateSkillResultsData;
  }

  /**
   * @description Analyze user assessment results and recommend matching occupations
   * @tags dbtn/module:analyze_results, dbtn/hasAuth
   * @name analyze_assessment_results
   * @summary Analyze Assessment Results
   * @request POST:/routes/analyze-results
   */
  export namespace analyze_assessment_results {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AnalysisRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AnalyzeAssessmentResultsData;
  }

  /**
   * @description Retrieves all assessment results for a given user from Firestore. This includes interest, ability, knowledge, skills, and career recommendations. The data is intended for use by an n8n workflow to generate a comprehensive report.
   * @tags dbtn/module:user_data
   * @name get_user_assessments
   * @summary Get User Assessments
   * @request GET:/routes/user-assessments/{user_id}
   */
  export namespace get_user_assessments {
    export type RequestParams = {
      /** User Id */
      userId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetUserAssessmentsData;
  }

  /**
   * @description Get all ability assessment questions
   * @tags dbtn/module:assessment_api, dbtn/hasAuth
   * @name get_ability_questions
   * @summary Get Ability Questions
   * @request GET:/routes/ability-questions
   */
  export namespace get_ability_questions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAbilityQuestionsData;
  }

  /**
   * @description Calculate ability assessment results based on answers
   * @tags dbtn/module:assessment_api, dbtn/hasAuth
   * @name calculate_ability_results
   * @summary Calculate Ability Results
   * @request POST:/routes/calculate-ability-results
   */
  export namespace calculate_ability_results {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AbilityAnswersRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CalculateAbilityResultsData;
  }

  /**
   * @description Get all assessment questions
   * @tags dbtn/module:assessment_api, dbtn/hasAuth
   * @name get_questions
   * @summary Get Questions
   * @request GET:/routes/questions
   */
  export namespace get_questions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetQuestionsData;
  }

  /**
   * @description Calculate assessment results based on answers
   * @tags dbtn/module:assessment_api, dbtn/hasAuth
   * @name calculate_results
   * @summary Calculate Results
   * @request POST:/routes/calculate-results
   */
  export namespace calculate_results {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AnswersRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CalculateResultsData;
  }

  /**
   * @description Original single-category endpoint (backward compatibility)
   * @tags dbtn/module:career_recommendation, dbtn/hasAuth
   * @name analyze_results
   * @summary Analyze Results
   * @request POST:/routes/career-recommendation/analyze
   */
  export namespace analyze_results {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UserScores;
    export type RequestHeaders = {};
    export type ResponseBody = AnalyzeResultsData;
  }

  /**
   * @description Return the current calibration values and a small sample of rules.
   * @tags dbtn/module:career_recommendation, dbtn/hasAuth
   * @name get_calibration
   * @summary Get Calibration
   * @request GET:/routes/career-recommendation/calibration
   */
  export namespace get_calibration {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCalibrationData;
  }

  /**
   * @description Re-run calibration using live O*NET frames from Databutton storage.
   * @tags dbtn/module:career_recommendation, dbtn/hasAuth
   * @name calibrate
   * @summary Calibrate
   * @request POST:/routes/career-recommendation/calibrate
   */
  export namespace calibrate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = CalibrationRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CalibrateData;
  }

  /**
   * No description
   * @tags dbtn/module:career_recommendation, dbtn/hasAuth
   * @name optimize_weights
   * @summary Optimize Weights
   * @request POST:/routes/career-recommendation/optimize-weights
   */
  export namespace optimize_weights {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = OptimizationRequest;
    export type RequestHeaders = {};
    export type ResponseBody = OptimizeWeightsData;
  }

  /**
   * No description
   * @tags dbtn/module:career_recommendation, dbtn/hasAuth
   * @name calibrate_scores
   * @summary Calibrate Scores
   * @request POST:/routes/career-recommendation/calibrate-scores
   */
  export namespace calibrate_scores {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ScoreCalibrationRequest;
    export type RequestHeaders = {};
    export type ResponseBody = CalibrateScoresData;
  }

  /**
   * @description New multi-category weighted aggregation endpoint
   * @tags dbtn/module:career_recommendation, dbtn/hasAuth
   * @name analyze_multi_category
   * @summary Analyze Multi Category
   * @request POST:/routes/career-recommendation/analyze-multi
   */
  export namespace analyze_multi_category {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = UserScores;
    export type RequestHeaders = {};
    export type ResponseBody = AnalyzeMultiCategoryData;
  }
}
