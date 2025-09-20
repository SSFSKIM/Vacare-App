/**
 * This utility contains helper functions to migrate skill and knowledge test pages
 * from the local storage assessment store to the Firebase assessment store.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeFirebaseAssessment, useFirebaseAssessmentStore } from './firebase-assessment-store';

/**
 * Hook to initialize Firebase assessment store in test components
 */
export function useInitializeFirebaseStore() {
  useEffect(() => {
    initializeFirebaseAssessment();
  }, []);
}

/**
 * Helper hook for skill tests to provide Firebase store integration
 * @param skillType The type/category of skill being tested
 */
export function useSkillTestStore(skillType: string) {
  const { 
    setSkillResults, 
    isLoading: storeLoading, 
    error: storeError 
  } = useFirebaseAssessmentStore();
  const navigate = useNavigate();

  /**
   * Handles submission of skill test answers
   * @param answers Formatted skill test answers
   */
  const handleSubmitSkillAnswers = async (resultsData: any) => {
    try {
      await setSkillResults(resultsData.results, skillType);
      navigate("/skill-selection");
      return true;
    } catch (error) {
      console.error(`Error saving ${skillType} skill results:`, error);
      return false;
    }
  };

  return {
    setSkillResults: handleSubmitSkillAnswers,
    storeLoading,
    storeError
  };
}

/**
 * Helper hook for knowledge tests to provide Firebase store integration
 * @param knowledgeType The type/category of knowledge being tested
 */
export function useKnowledgeTestStore(knowledgeType: string) {
  const { 
    setKnowledgeResults, 
    isLoading: storeLoading, 
    error: storeError 
  } = useFirebaseAssessmentStore();
  const navigate = useNavigate();

  /**
   * Handles submission of knowledge test answers
   * @param answers Formatted knowledge test answers
   */
  const handleSubmitKnowledgeAnswers = async (resultsData: any) => {
    try {
      await setKnowledgeResults(resultsData.results, knowledgeType);
      navigate("/knowledge-selection");
      return true;
    } catch (error) {
      console.error(`Error saving ${knowledgeType} knowledge results:`, error);
      return false;
    }
  };

  return {
    setKnowledgeResults: handleSubmitKnowledgeAnswers,
    storeLoading,
    storeError
  };
}

/**
 * Helper hook for ability tests to provide Firebase store integration
 * @param abilityType The type/category of ability being tested
 */
export function useAbilityTestStore(abilityType: string) {
  const { 
    setAbilityResults, 
    isLoading: storeLoading, 
    error: storeError 
  } = useFirebaseAssessmentStore();
  const navigate = useNavigate();

  /**
   * Handles submission of ability test answers
   * @param resultsData Formatted ability test answers and results
   */
  const handleSubmitAbilityAnswers = async (resultsData: any) => {
    try {
      await setAbilityResults(resultsData.results, abilityType);
      navigate("/ability-selection");
      return true;
    } catch (error) {
      console.error(`Error saving ${abilityType} ability results:`, error);
      return false;
    }
  };

  return {
    setAbilityResults: handleSubmitAbilityAnswers,
    storeLoading,
    storeError
  };
}
