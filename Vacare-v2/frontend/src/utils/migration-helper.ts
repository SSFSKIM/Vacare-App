
// Enhanced migration-helper.ts with improved data safety

import { useAssessmentStore } from './assessment-store';
import { useFirebaseAssessmentStore } from './firebase-assessment-store';
import { useUserGuardContext } from 'app';
import { useEffect, useRef } from 'react';

/**
 * Enhanced migration hook with comprehensive data protection
 */
export const useMigrateAssessmentData = () => {
  const { user } = useUserGuardContext();
  const localData = useAssessmentStore();
  const firebaseStore = useFirebaseAssessmentStore();
  const migrationAttempted = useRef(false);
  
  // Enhanced data migration with multiple safety checks
  const migrateData = async () => {
    if (!user || !firebaseStore.assessment || migrationAttempted.current) {
      return;
    }
    
    // Wait for complete initialization
    if (firebaseStore.initializationPhase !== 'complete') {
      console.log('Migration postponed: initialization not complete');
      return;
    }
    
    // Mark migration as attempted to prevent duplicates
    migrationAttempted.current = true;
    
    try {
      console.log('Starting enhanced data migration...');
      
      // Multi-level data existence check
      const hasFirestoreAnswers = (
        firebaseStore.assessment.interest.answers.length > 0 ||
        firebaseStore.assessment.ability.answers.length > 0 ||
        firebaseStore.assessment.knowledge.answers.length > 0 ||
        firebaseStore.assessment.skills.answers.length > 0
      );
      
      const hasFirestoreResults = (
        firebaseStore.assessment.interest.results.length > 0 ||
        firebaseStore.assessment.ability.results.length > 0 ||
        firebaseStore.assessment.knowledge.results.length > 0 ||
        firebaseStore.assessment.skills.results.length > 0 ||
        firebaseStore.assessment.careerRecommendations !== null
      );
      
      const hasFirestoreProgress = (
        firebaseStore.assessment.interest.currentQuestionIndex > 0 ||
        firebaseStore.assessment.ability.currentQuestionIndex > 0
      );
      
      const hasAnyFirestoreData = hasFirestoreAnswers || hasFirestoreResults || hasFirestoreProgress;
      
      // Check local data existence
      const hasLocalAnswers = localData.answers.length > 0;
      const hasLocalResults = Object.values(localData.results).some(category => 
        Array.isArray(category) ? category.length > 0 : false
      );
      const hasLocalProgress = localData.currentQuestionIndex > 0;
      const hasAnyLocalData = hasLocalAnswers || hasLocalResults || hasLocalProgress;
      
      console.log('Migration check:', {
        hasAnyFirestoreData,
        hasAnyLocalData,
        firebaseInitPhase: firebaseStore.initializationPhase
      });
      
      // Safety rule: Never overwrite existing Firestore data
      if (hasAnyFirestoreData) {
        console.log('Firestore data exists, migration skipped for safety');
        return;
      }
      
      // Only migrate if there's actual local data to migrate
      if (!hasAnyLocalData) {
        console.log('No local data to migrate');
        return;
      }
      
      console.log('Proceeding with data migration...');
      
      // Migrate Interest data with error handling
      if (localData.answers.length > 0) {
        try {
          await firebaseStore.setInterestQuestionIndex(localData.currentQuestionIndex);
          
          // Migrate answers one by one with delays to prevent race conditions
          for (const answer of localData.answers) {
            await firebaseStore.setInterestAnswer(answer);
            // Small delay to prevent overwhelming Firestore
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          console.log(`Migrated ${localData.answers.length} interest answers`);
        } catch (error) {
          console.error('Error migrating interest answers:', error);
          throw error;
        }
      }
      
      // Migrate Interest results
      if (localData.results.interest?.length > 0) {
        try {
          await firebaseStore.setInterestResults(localData.results.interest);
          console.log('Migrated interest results');
        } catch (error) {
          console.error('Error migrating interest results:', error);
          throw error;
        }
      }
      
      // Migrate Ability data if available
      if (localData.results.ability?.length > 0) {
        try {
          await firebaseStore.setAbilityResults(localData.results.ability, 'general');
          console.log('Migrated ability results');
        } catch (error) {
          console.error('Error migrating ability results:', error);
          throw error;
        }
      }
      
      // Migrate Knowledge data if available
      if (localData.results.knowledge?.length > 0) {
        try {
          await firebaseStore.setKnowledgeResults(localData.results.knowledge, 'general');
          console.log('Migrated knowledge results');
        } catch (error) {
          console.error('Error migrating knowledge results:', error);
          throw error;
        }
      }
      
      // Migrate Skills data if available
      if (localData.results.skills?.length > 0) {
        try {
          await firebaseStore.setSkillResults(localData.results.skills, 'general');
          console.log('Migrated skill results');
        } catch (error) {
          console.error('Error migrating skill results:', error);
          throw error;
        }
      }
      
      console.log('Data migration completed successfully');
      
      // Optional: Clear local data after successful migration
      // This step can be uncommented if you want to clean up localStorage
      /*
      if (window.confirm('Migration successful. Clear local data?')) {
        localStorage.removeItem('assessment-store');
        console.log('Local data cleared after migration');
      }
      */
      
    } catch (error) {
      console.error('Migration failed:', error);
      migrationAttempted.current = false; // Allow retry on next login
      throw error;
    }
  };
  
  // Enhanced useEffect with proper dependencies and timing
  useEffect(() => {
    if (
      user && 
      firebaseStore.assessment && 
      firebaseStore.initializationPhase === 'complete' &&
      !migrationAttempted.current
    ) {
      // Add a small delay to ensure everything is fully loaded
      const migrationTimer = setTimeout(() => {
        migrateData().catch(error => {
          console.error('Migration error in useEffect:', error);
        });
      }, 1000); // 1 second delay for safety
      
      return () => clearTimeout(migrationTimer);
    }
  }, [
    user?.uid, 
    firebaseStore.assessment?.userId, 
    firebaseStore.initializationPhase,
    firebaseStore.isDataCheckComplete
  ]);
  
  // Reset migration flag when user changes
  useEffect(() => {
    migrationAttempted.current = false;
  }, [user?.uid]);
  
  return {
    migrateData,
    migrationAttempted: migrationAttempted.current,
    canMigrate: user && firebaseStore.assessment && firebaseStore.initializationPhase === 'complete'
  };
};

/**
 * Hook to safely check if data migration is needed
 */
export const useDataMigrationStatus = () => {
  const { user } = useUserGuardContext();
  const localData = useAssessmentStore();
  const firebaseStore = useFirebaseAssessmentStore();
  
  const hasLocalData = localData.answers.length > 0 || 
    Object.values(localData.results).some(category => 
      Array.isArray(category) ? category.length > 0 : false
    );
  
  const hasFirebaseData = firebaseStore.assessment && (
    firebaseStore.assessment.interest.answers.length > 0 ||
    firebaseStore.assessment.ability.answers.length > 0 ||
    firebaseStore.assessment.knowledge.answers.length > 0 ||
    firebaseStore.assessment.skills.answers.length > 0 ||
    firebaseStore.assessment.interest.results.length > 0 ||
    firebaseStore.assessment.ability.results.length > 0 ||
    firebaseStore.assessment.knowledge.results.length > 0 ||
    firebaseStore.assessment.skills.results.length > 0 ||
    firebaseStore.assessment.careerRecommendations !== null
  );
  
  return {
    needsMigration: user && hasLocalData && !hasFirebaseData && firebaseStore.initializationPhase === 'complete',
    hasLocalData,
    hasFirebaseData,
    isReady: firebaseStore.initializationPhase === 'complete'
  };
};
