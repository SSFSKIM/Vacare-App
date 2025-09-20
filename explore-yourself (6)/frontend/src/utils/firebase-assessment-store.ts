

// Enhanced firebase-assessment-store.ts with improved data protection

import { create } from "zustand";
import { firebaseAuth } from "app";
import { User } from "firebase/auth";
import {
  subscribeToAssessment,
  initializeAssessment,
  updateInterestAnswers,
  updateInterestResults,
  updateAbilityAnswers,
  updateAbilityResults,
  updateKnowledgeAnswers,
  updateKnowledgeResults,
  updateSkillAnswers,
  updateSkillResults,
  updateCareerRecommendations,
  getAssessment, // Direct Firestore read
} from "./firestore";
import {
  Answer,
  AbilityAnswer,
  AssessmentData,
  AssessmentResult,
  KnowledgeSubsetResult,
  AbilitySubsetResult,
  SkillSubsetResult,
  CareerRecommendations,
} from "../types";

// Enhanced store interface with data protection
interface FirebaseAssessmentStore {
  // User related
  user: User | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  
  // Data protection states
  isDataCheckComplete: boolean;
  hasExistingData: boolean;
  initializationPhase: 'idle' | 'checking' | 'loading' | 'complete' | 'error';
  
  // Assessment data
  assessment: AssessmentData | null;
  
  // Enhanced initialization
  initialize: () => void;
  
  // Data protection methods
  safeInitializeAssessment: (userId: string) => Promise<void>;
  checkExistingData: (userId: string) => Promise<boolean>;
  
  // Assessment methods (unchanged)
  setInterestAnswer: (answer: Answer) => Promise<void>;
  setInterestQuestionIndex: (index: number) => Promise<void>;
  setInterestResults: (results: AssessmentResult[]) => Promise<void>;
  resetInterestAssessment: () => Promise<void>;
  setAbilityAnswer: (answer: AbilityAnswer) => Promise<void>;
  setAbilityQuestionIndex: (index: number) => Promise<void>;
  setAbilityResults: (results: AbilitySubsetResult[], subset: string) => Promise<void>;
  resetAbilityAssessment: () => Promise<void>;
  setKnowledgeAnswer: (answer: Answer) => Promise<void>;
  setKnowledgeResults: (results: KnowledgeSubsetResult[], subset: string) => Promise<void>;
  resetKnowledgeAssessment: () => Promise<void>;
  setSkillAnswer: (answer: Answer) => Promise<void>;
  setSkillResults: (results: SkillSubsetResult[], subset: string) => Promise<void>;
  resetSkillAssessment: () => Promise<void>;
  setCareerRecommendations: (recommendations: CareerRecommendations) => Promise<void>;
  resetAllAssessments: () => Promise<void>;
}

export const useFirebaseAssessmentStore = create<FirebaseAssessmentStore>((set, get) => ({
  // Initial state
  user: null,
  isInitialized: false,
  isLoading: true,
  error: null,
  
  // Data protection states
  isDataCheckComplete: false,
  hasExistingData: false,
  initializationPhase: 'idle',
  
  assessment: null,
  
  // Enhanced data existence check
  checkExistingData: async (userId: string): Promise<boolean> => {
    try {
      set({ initializationPhase: 'checking' });
      
      // Direct Firestore read with retry mechanism
      let attempts = 0;
      const maxAttempts = 3;
      let existingData: AssessmentData | null = null;
      
      while (attempts < maxAttempts && existingData === null) {
        try {
          existingData = await getAssessment(userId);
          break;
        } catch (error) {
          attempts++;
          if (attempts === maxAttempts) throw error;
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      }
      
      if (existingData) {
        // Check if there's any meaningful data
        const hasAnswers = (
          (existingData.interest?.answers?.length > 0) ||
          (existingData.ability?.answers?.length > 0) ||
          (existingData.knowledge?.answers?.length > 0) ||
          (existingData.skills?.answers?.length > 0)
        );
        
        const hasResults = (
          (existingData.interest?.results?.length > 0) ||
          (existingData.ability?.results?.length > 0) ||
          (existingData.knowledge?.results?.length > 0) ||
          (existingData.skills?.results?.length > 0) ||
          existingData.careerRecommendations !== null
        );
        
        const hasExistingData = hasAnswers || hasResults;
        
        set({ 
          hasExistingData,
          isDataCheckComplete: true,
          assessment: existingData
        });
        
        console.log(`Data check complete for user ${userId}: hasData=${hasExistingData}`);
        return hasExistingData;
      } else {
        set({ 
          hasExistingData: false,
          isDataCheckComplete: true
        });
        console.log(`No existing data found for user ${userId}`);
        return false;
      }
    } catch (error) {
      console.error('Error checking existing data:', error);
      set({ 
        error: error as Error,
        isDataCheckComplete: true,
        initializationPhase: 'error'
      });
      return false; // Conservative approach: assume no data to prevent overwrites
    }
  },
  
  // Safe assessment initialization
  safeInitializeAssessment: async (userId: string): Promise<void> => {
    const { hasExistingData, isDataCheckComplete } = get();
    
    // Only initialize if we're sure there's no existing data
    if (!isDataCheckComplete) {
      console.warn('Attempted to initialize before data check complete');
      return;
    }
    
    if (hasExistingData) {
      console.log('Existing data found, skipping initialization');
      return;
    }
    
    try {
      set({ initializationPhase: 'loading' });
      
      // Create empty assessment
      const emptyAssessment: AssessmentData = {
        userId,
        interest: {
          answers: [],
          currentQuestionIndex: 0,
          results: []
        },
        ability: {
          answers: [],
          currentQuestionIndex: 0,
          results: []
        },
        knowledge: {
          answers: [],
          results: []
        },
        skills: {
          answers: [],
          results: []
        },
        careerRecommendations: null,
        lastUpdated: Date.now()
      };
      
      await initializeAssessment(userId);
      
      set({ 
        assessment: emptyAssessment,
        initializationPhase: 'complete'
      });
      
      console.log('New assessment initialized for user:', userId);
    } catch (error) {
      console.error('Error initializing assessment:', error);
      set({ 
        error: error as Error,
        initializationPhase: 'error'
      });
    }
  },
  
  // Enhanced initialization with proper data protection
  initialize: () => {
    const { isInitialized } = get();
    if (isInitialized) return;
    set({ isInitialized: true });

    let unsubscribeAssessment: (() => void) | null = null;

    const unsubscribeAuth = firebaseAuth.onAuthStateChanged(async (user) => {
      if (user) {
        set({ 
          user, 
          isLoading: true,
          initializationPhase: 'checking'
        });

        try {
          // Step 1: Check for existing data first
          const hasData = await get().checkExistingData(user.uid);
          
          // Step 2: Only initialize if no data exists
          if (!hasData) {
            await get().safeInitializeAssessment(user.uid);
          }
          
          // Step 3: Subscribe to real-time updates
          unsubscribeAssessment = subscribeToAssessment(user.uid, (assessment) => {
            if (assessment) {
              set({ 
                assessment,
                isLoading: false,
                initializationPhase: 'complete'
              });
            }
          });
          
        } catch (error) {
          console.error('Error during user initialization:', error);
          set({ 
            error: error as Error, 
            isLoading: false,
            initializationPhase: 'error'
          });
        }
      } else {
        // User signed out
        if (unsubscribeAssessment) {
          unsubscribeAssessment();
          unsubscribeAssessment = null;
        }
        
        set({ 
          user: null, 
          assessment: null, 
          isLoading: false,
          isDataCheckComplete: false,
          hasExistingData: false,
          initializationPhase: 'idle',
          error: null
        });
      }
    });

    // Return cleanup function
    return () => {
      unsubscribeAuth();
      if (unsubscribeAssessment) {
        unsubscribeAssessment();
      }
    };
  },
  
  // Assessment methods (keeping existing implementation but adding safety checks)
  setInterestAnswer: async (answer) => {
    const { user, assessment, initializationPhase } = get();
    if (!user || !assessment || initializationPhase !== 'complete') {
      console.warn('Cannot set answer: user not authenticated or initialization incomplete');
      return;
    }
    
    try {
      const updatedAnswers = [
        ...assessment.interest.answers.filter(a => a.questionId !== answer.questionId),
        answer
      ];
      
      set({
        assessment: {
          ...assessment,
          interest: {
            ...assessment.interest,
            answers: updatedAnswers
          }
        }
      });
      
      await updateInterestAnswers(
        user.uid,
        updatedAnswers,
        assessment.interest.currentQuestionIndex
      );
    } catch (error) {
      console.error('Error setting interest answer:', error);
      set({ error: error as Error });
    }
  },
  
  setInterestQuestionIndex: async (index) => {
    const { user, assessment, initializationPhase } = get();
    if (!user || !assessment || initializationPhase !== 'complete') return;
    
    try {
      set({
        assessment: {
          ...assessment,
          interest: {
            ...assessment.interest,
            currentQuestionIndex: index
          }
        }
      });
      
      await updateInterestAnswers(
        user.uid,
        assessment.interest.answers,
        index
      );
    } catch (error) {
      console.error('Error setting interest question index:', error);
      set({ error: error as Error });
    }
  },
  
  setInterestResults: async (results) => {
    const { user, assessment, initializationPhase } = get();
    if (!user || !assessment || initializationPhase !== 'complete') return;
    
    try {
      set({
        assessment: {
          ...assessment,
          interest: {
            ...assessment.interest,
            results
          }
        }
      });
      
      await updateInterestResults(user.uid, results);
    } catch (error) {
      console.error('Error setting interest results:', error);
      set({ error: error as Error });
    }
  },
  
  // Add similar safety checks to all other methods...
  resetInterestAssessment: async () => {
    const { user, assessment, initializationPhase } = get();
    if (!user || !assessment || initializationPhase !== 'complete') return;
    
    try {
      const resetInterest = {
        answers: [],
        currentQuestionIndex: 0,
        results: []
      };
      
      set({
        assessment: {
          ...assessment,
          interest: resetInterest
        }
      });
      
      await updateInterestAnswers(user.uid, [], 0);
      await updateInterestResults(user.uid, []);
    } catch (error) {
      console.error('Error resetting interest assessment:', error);
      set({ error: error as Error });
    }
  },
  
  // Implement other methods with similar safety checks...
  // setAbilityAnswer implementation
  setAbilityAnswer: async (answer) => {
    const { user, assessment, initializationPhase } = get();
    if (!user || !assessment || initializationPhase !== 'complete') {
      console.warn('Cannot set ability answer: user not authenticated or initialization incomplete');
      return;
    }
    
    try {
      const updatedAnswers = [
        ...assessment.ability.answers.filter(a => a.questionId !== answer.questionId),
        answer
      ];
      
      set({
        assessment: {
          ...assessment,
          ability: {
            ...assessment.ability,
            answers: updatedAnswers
          }
        }
      });
      
      await updateAbilityAnswers(
        user.uid,
        updatedAnswers,
        assessment.ability.currentQuestionIndex
      );
    } catch (error) {
      console.error('Error setting ability answer:', error);
      set({ error: error as Error });
    }
  },

  // setAbilityQuestionIndex implementation
  setAbilityQuestionIndex: async (index) => {
    const { user, assessment, initializationPhase } = get();
    if (!user || !assessment || initializationPhase !== 'complete') return;
    
    try {
      set({
        assessment: {
          ...assessment,
          ability: {
            ...assessment.ability,
            currentQuestionIndex: index
          }
        }
      });
      
      await updateAbilityAnswers(
        user.uid,
        assessment.ability.answers,
        index
      );
    } catch (error) {
      console.error('Error setting ability question index:', error);
      set({ error: error as Error });
    }
  },

  // CRITICAL FIX: setAbilityResults implementation
  setAbilityResults: async (results, subset) => {
    const { user, assessment, initializationPhase } = get();
    if (!user || !assessment || initializationPhase !== 'complete') {
      console.warn('Cannot set ability results: user not authenticated or initialization incomplete');
      return;
    }
    
    try {
      // Ensure each result has the subset field
      const resultsWithSubset = results.map(r => ({
        ...r,
        subset: subset
      }));
      
      // Merge with existing results, replacing only the same subset
      const existingResults = assessment.ability.results || [];
      const otherSubsetResults = existingResults.filter(r => r.subset !== subset);
      const updatedResults = [...otherSubsetResults, ...resultsWithSubset];
      
      // Update local state
      set({
        assessment: {
          ...assessment,
          ability: {
            ...assessment.ability,
            results: updatedResults
          }
        }
      });
      
      // Update Firebase
      await updateAbilityResults(user.uid, updatedResults);
      console.log(`Successfully saved ${subset} ability results to Firebase`);
    } catch (error) {
      console.error('Error setting ability results:', error);
      set({ error: error as Error });
      throw error; // Re-throw to handle in calling code
    }
  },

  // resetAbilityAssessment implementation
  resetAbilityAssessment: async () => {
    const { user, assessment, initializationPhase } = get();
    if (!user || !assessment || initializationPhase !== 'complete') return;
    
    try {
      const resetAbility = {
        answers: [],
        currentQuestionIndex: 0,
        results: []
      };
      
      set({
        assessment: {
          ...assessment,
          ability: resetAbility
        }
      });
      
      await updateAbilityAnswers(user.uid, [], 0);
      await updateAbilityResults(user.uid, []);
    } catch (error) {
      console.error('Error resetting ability assessment:', error);
      set({ error: error as Error });
    }
  },

  // setKnowledgeAnswer implementation
  setKnowledgeAnswer: async (answer) => {
    const { user, assessment, initializationPhase } = get();
    if (!user || !assessment || initializationPhase !== 'complete') {
      console.warn('Cannot set knowledge answer: user not authenticated or initialization incomplete');
      return;
    }
    
    try {
      const updatedAnswers = [
        ...assessment.knowledge.answers.filter(a => a.questionId !== answer.questionId),
        answer
      ];
      
      set({
        assessment: {
          ...assessment,
          knowledge: {
            ...assessment.knowledge,
            answers: updatedAnswers
          }
        }
      });
      
      await updateKnowledgeAnswers(user.uid, updatedAnswers);
    } catch (error) {
      console.error('Error setting knowledge answer:', error);
      set({ error: error as Error });
    }
  },

  // setKnowledgeResults implementation
  setKnowledgeResults: async (results, subset) => {
    const { user, assessment, initializationPhase } = get();
    if (!user || !assessment || initializationPhase !== 'complete') {
      console.warn('Cannot set knowledge results: user not authenticated or initialization incomplete');
      return;
    }
    
    try {
      // Ensure each result has the subset field
      const resultsWithSubset = results.map(r => ({
        ...r,
        subset: subset
      }));
      
      // Merge with existing results, replacing only the same subset
      const existingResults = assessment.knowledge.results || [];
      const otherSubsetResults = existingResults.filter(r => r.subset !== subset);
      const updatedResults = [...otherSubsetResults, ...resultsWithSubset];
      
      // Update local state
      set({
        assessment: {
          ...assessment,
          knowledge: {
            ...assessment.knowledge,
            results: updatedResults
          }
        }
      });
      
      // Update Firebase
      await updateKnowledgeResults(user.uid, updatedResults);
      console.log(`Successfully saved ${subset} knowledge results to Firebase`);
    } catch (error) {
      console.error('Error setting knowledge results:', error);
      set({ error: error as Error });
      throw error;
    }
  },

  // resetKnowledgeAssessment implementation
  resetKnowledgeAssessment: async () => {
    const { user, assessment, initializationPhase } = get();
    if (!user || !assessment || initializationPhase !== 'complete') return;
    
    try {
      const resetKnowledge = {
        answers: [],
        results: []
      };
      
      set({
        assessment: {
          ...assessment,
          knowledge: resetKnowledge
        }
      });
      
      await updateKnowledgeAnswers(user.uid, []);
      await updateKnowledgeResults(user.uid, []);
    } catch (error) {
      console.error('Error resetting knowledge assessment:', error);
      set({ error: error as Error });
    }
  },

  // setSkillAnswer implementation
  setSkillAnswer: async (answer) => {
    const { user, assessment, initializationPhase } = get();
    if (!user || !assessment || initializationPhase !== 'complete') {
      console.warn('Cannot set skill answer: user not authenticated or initialization incomplete');
      return;
    }
    
    try {
      const updatedAnswers = [
        ...assessment.skills.answers.filter(a => a.questionId !== answer.questionId),
        answer
      ];
      
      set({
        assessment: {
          ...assessment,
          skills: {
            ...assessment.skills,
            answers: updatedAnswers
          }
        }
      });
      
      await updateSkillAnswers(user.uid, updatedAnswers);
    } catch (error) {
      console.error('Error setting skill answer:', error);
      set({ error: error as Error });
    }
  },

  // setSkillResults implementation
  setSkillResults: async (results, subset) => {
    const { user, assessment, initializationPhase } = get();
    if (!user || !assessment || initializationPhase !== 'complete') {
      console.warn('Cannot set skill results: user not authenticated or initialization incomplete');
      return;
    }
    
    try {
      // Ensure each result has the subset field
      const resultsWithSubset = results.map(r => ({
        ...r,
        subset: subset
      }));
      
      // Merge with existing results, replacing only the same subset
      const existingResults = assessment.skills.results || [];
      const otherSubsetResults = existingResults.filter(r => r.subset !== subset);
      const updatedResults = [...otherSubsetResults, ...resultsWithSubset];
      
      // Update local state
      set({
        assessment: {
          ...assessment,
          skills: {
            ...assessment.skills,
            results: updatedResults
          }
        }
      });
      
      // Update Firebase
      await updateSkillResults(user.uid, updatedResults);
      console.log(`Successfully saved ${subset} skill results to Firebase`);
    } catch (error) {
      console.error('Error setting skill results:', error);
      set({ error: error as Error });
      throw error;
    }
  },

  // resetSkillAssessment implementation
  resetSkillAssessment: async () => {
    const { user, assessment, initializationPhase } = get();
    if (!user || !assessment || initializationPhase !== 'complete') return;
    
    try {
      const resetSkills = {
        answers: [],
        results: []
      };
      
      set({
        assessment: {
          ...assessment,
          skills: resetSkills
        }
      });
      
      await updateSkillAnswers(user.uid, []);
      await updateSkillResults(user.uid, []);
    } catch (error) {
      console.error('Error resetting skill assessment:', error);
      set({ error: error as Error });
    }
  },

  // setCareerRecommendations implementation
  setCareerRecommendations: async (recommendations) => {
    const { user, assessment, initializationPhase } = get();
    if (!user || !assessment || initializationPhase !== 'complete') {
      console.warn('Cannot set career recommendations: user not authenticated or initialization incomplete');
      return;
    }
    
    try {
      set({
        assessment: {
          ...assessment,
          careerRecommendations: recommendations
        }
      });
      
      await updateCareerRecommendations(user.uid, recommendations);
      console.log('Successfully saved career recommendations to Firebase');
    } catch (error) {
      console.error('Error setting career recommendations:', error);
      set({ error: error as Error });
      throw error;
    }
  },
  
  resetAllAssessments: async () => {
    const { user, initializationPhase } = get();
    if (!user || initializationPhase !== 'complete') return;
    
    try {
      await get().safeInitializeAssessment(user.uid);
    } catch (error) {
      console.error('Error resetting all assessments:', error);
      set({ error: error as Error });
    }
  },
}));

// Enhanced initialization function
export const initializeFirebaseAssessment = () => {
  const store = useFirebaseAssessmentStore.getState();
  return store.initialize();
};
