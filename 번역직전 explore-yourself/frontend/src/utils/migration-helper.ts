import { useAssessmentStore } from './assessment-store';
import { useFirebaseAssessmentStore } from './firebase-assessment-store';
import { useUserGuardContext } from 'app';

/**
 * Helper hook to migrate data from local storage to Firestore
 * when a user is authenticated
 */
export const useMigrateAssessmentData = () => {
  const { user } = useUserGuardContext();
  const localData = useAssessmentStore();
  const firebaseStore = useFirebaseAssessmentStore();
  
  // Function to migrate data from local storage to Firestore
  const migrateData = async () => {
    if (!user || !firebaseStore.assessment) return;
    
    try {
      // Check if Firestore already has data
      const hasFirestoreData = (
        firebaseStore.assessment.interest.answers.length > 0 ||
        firebaseStore.assessment.ability.answers.length > 0 ||
        firebaseStore.assessment.knowledge.answers.length > 0 ||
        firebaseStore.assessment.skills.answers.length > 0
      );
      
      // If data already exists in Firestore, don't overwrite it
      if (hasFirestoreData) {
        console.log('Data already exists in Firestore, skipping migration');
        return;
      }
      
      // Migrate Interest data
      if (localData.answers.length > 0) {
        await firebaseStore.setInterestQuestionIndex(localData.currentQuestionIndex);
        
        // Migrate each answer one by one
        for (const answer of localData.answers) {
          await firebaseStore.setInterestAnswer(answer);
        }
      }
      
      if (localData.results.interest.length > 0) {
        await firebaseStore.setInterestResults(localData.results.interest);
      }
      
      // Migrate Ability data
      if (localData.abilityAnswers.length > 0) {
        await firebaseStore.setAbilityQuestionIndex(localData.currentAbilityIndex);
        
        // Migrate each answer one by one
        for (const answer of localData.abilityAnswers) {
          await firebaseStore.setAbilityAnswer(answer);
        }
      }
      
      if (localData.results.ability.length > 0) {
        // Group ability results by subset
        const subsetGroups: { [key: string]: any[] } = {};
        
        localData.results.ability.forEach(result => {
          if (!subsetGroups[result.subset]) {
            subsetGroups[result.subset] = [];
          }
          subsetGroups[result.subset].push(result);
        });
        
        // Migrate each subset group
        for (const [subset, results] of Object.entries(subsetGroups)) {
          await firebaseStore.setAbilityResults(results, subset);
        }
      }
      
      // Migrate Knowledge data
      if (localData.knowledgeAnswers.length > 0) {
        // Migrate each answer one by one
        for (const answer of localData.knowledgeAnswers) {
          await firebaseStore.setKnowledgeAnswer(answer);
        }
      }
      
      if (localData.results.knowledge.length > 0) {
        // Group knowledge results by subset
        const subsetGroups: { [key: string]: any[] } = {};
        
        localData.results.knowledge.forEach(result => {
          if (!subsetGroups[result.subset]) {
            subsetGroups[result.subset] = [];
          }
          subsetGroups[result.subset].push(result);
        });
        
        // Migrate each subset group
        for (const [subset, results] of Object.entries(subsetGroups)) {
          await firebaseStore.setKnowledgeResults(results, subset);
        }
      }
      
      // Migrate Skills data
      if (localData.skillAnswers.length > 0) {
        // Migrate each answer one by one
        for (const answer of localData.skillAnswers) {
          await firebaseStore.setSkillAnswer(answer);
        }
      }
      
      if (localData.results.skills.length > 0) {
        // Group skills results by subset
        const subsetGroups: { [key: string]: any[] } = {};
        
        localData.results.skills.forEach(result => {
          if (!subsetGroups[result.subset]) {
            subsetGroups[result.subset] = [];
          }
          subsetGroups[result.subset].push(result);
        });
        
        // Migrate each subset group
        for (const [subset, results] of Object.entries(subsetGroups)) {
          await firebaseStore.setSkillResults(results, subset);
        }
      }
      
      // Migrate Career Recommendations
      if (localData.results.careerRecommendations) {
        await firebaseStore.setCareerRecommendations(localData.results.careerRecommendations);
      }
      
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Error during migration:', error);
    }
  };
  
  return { migrateData };
};
