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

// Interface for our store
interface FirebaseAssessmentStore {
  // User related
  user: User | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  
  // Assessment data
  assessment: AssessmentData | null;
  
  // Methods for Interest assessment
  setInterestAnswer: (answer: Answer) => Promise<void>;
  setInterestQuestionIndex: (index: number) => Promise<void>;
  setInterestResults: (results: AssessmentResult[]) => Promise<void>;
  resetInterestAssessment: () => Promise<void>;
  
  // Methods for Ability assessment
  setAbilityAnswer: (answer: AbilityAnswer) => Promise<void>;
  setAbilityQuestionIndex: (index: number) => Promise<void>;
  setAbilityResults: (results: AbilitySubsetResult[], subset: string) => Promise<void>;
  resetAbilityAssessment: () => Promise<void>;
  
  // Methods for Knowledge assessment
  setKnowledgeAnswer: (answer: Answer) => Promise<void>;
  setKnowledgeResults: (results: KnowledgeSubsetResult[], subset: string) => Promise<void>;
  resetKnowledgeAssessment: () => Promise<void>;
  
  // Methods for Skills assessment
  setSkillAnswer: (answer: Answer) => Promise<void>;
  setSkillResults: (results: SkillSubsetResult[], subset: string) => Promise<void>;
  resetSkillAssessment: () => Promise<void>;
  
  // Career recommendations
  setCareerRecommendations: (recommendations: CareerRecommendations) => Promise<void>;
  
  // Global reset
  resetAllAssessments: () => Promise<void>;
  
  // Initialize the store with user data
  initialize: () => void;
}

export const useFirebaseAssessmentStore = create<FirebaseAssessmentStore>((set, get) => ({
  // Initial state
  user: null,
  isInitialized: false,
  isLoading: true,
  error: null,
  assessment: null,
  
  // Initialize the store with the current user and subscribe to Firestore
  initialize: () => {
    const { isInitialized } = get();
    if (isInitialized) return;
    set({ isInitialized: true });

    let unsubscribeAssessment: (() => void) | null = null;

    const unsubscribeAuth = firebaseAuth.onAuthStateChanged(
      async (currentUser) => {
        // Unsubscribe from previous user's data
        if (unsubscribeAssessment) {
          unsubscribeAssessment();
          unsubscribeAssessment = null;
        }

        set({ user: currentUser, isLoading: true });

        if (currentUser) {
          try {
            // Subscribe to the new user's assessment data
            unsubscribeAssessment = subscribeToAssessment(
              currentUser.uid,
              (assessmentData) => {
                if (assessmentData) {
                  set({ assessment: assessmentData, isLoading: false });
                } else {
                  // Create a new assessment if one doesn't exist
                  initializeAssessment(currentUser.uid)
                    .then(() => set({ isLoading: false }))
                    .catch((error) => set({ error, isLoading: false }));
                }
              },
            );
          } catch (error) {
            set({ error: error as Error, isLoading: false });
          }
        } else {
          // No user is signed in
          set({ assessment: null, isLoading: false });
        }
      },
    );

    // Note: The ideal cleanup for unsubscribeAuth would be tied to the app's lifecycle,
    // but for now, this structure correctly handles user session changes.
  },
  
  // Interest assessment methods
  setInterestAnswer: async (answer) => {
    const { user, assessment } = get();
    if (!user || !assessment) return;
    
    try {
      // Update locally first for UI responsiveness
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
      
      // Then update in Firestore
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
    const { user, assessment } = get();
    if (!user || !assessment) return;
    
    try {
      // Update locally first
      set({
        assessment: {
          ...assessment,
          interest: {
            ...assessment.interest,
            currentQuestionIndex: index
          }
        }
      });
      
      // Then update in Firestore
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
    const { user, assessment } = get();
    if (!user || !assessment) return;
    
    try {
      // Update locally first
      set({
        assessment: {
          ...assessment,
          interest: {
            ...assessment.interest,
            results
          }
        }
      });
      
      // Then update in Firestore
      await updateInterestResults(user.uid, results);
    } catch (error) {
      console.error('Error setting interest results:', error);
      set({ error: error as Error });
    }
  },
  
  resetInterestAssessment: async () => {
    const { user, assessment } = get();
    if (!user || !assessment) return;
    
    try {
      // Update locally first
      set({
        assessment: {
          ...assessment,
          interest: {
            answers: [],
            currentQuestionIndex: 0,
            results: []
          }
        }
      });
      
      // Then update in Firestore
      await updateInterestAnswers(user.uid, [], 0);
      await updateInterestResults(user.uid, []);
    } catch (error) {
      console.error('Error resetting interest assessment:', error);
      set({ error: error as Error });
    }
  },
  
  // Ability assessment methods
  setAbilityAnswer: async (answer) => {
    const { user, assessment } = get();
    if (!user || !assessment) return;
    
    try {
      // Update locally first
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
      
      // Then update in Firestore
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
  
  setAbilityQuestionIndex: async (index) => {
    const { user, assessment } = get();
    if (!user || !assessment) return;
    
    try {
      // Update locally first
      set({
        assessment: {
          ...assessment,
          ability: {
            ...assessment.ability,
            currentQuestionIndex: index
          }
        }
      });
      
      // Then update in Firestore
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
  
  setAbilityResults: async (results, subset) => {
    const { user, assessment } = get();
    if (!user || !assessment) return;
    
    try {
      // Filter out results with the same subset and add the new ones
      const updatedResults = [
        ...assessment.ability.results.filter(r => r.subset !== subset),
        ...results.map(item => ({ ...item, subset: subset }))
      ];
      
      // Update locally first
      set({
        assessment: {
          ...assessment,
          ability: {
            ...assessment.ability,
            results: updatedResults
          }
        }
      });
      
      // Then update in Firestore
      await updateAbilityResults(user.uid, updatedResults);
    } catch (error) {
      console.error('Error setting ability results:', error);
      set({ error: error as Error });
    }
  },
  
  resetAbilityAssessment: async () => {
    const { user, assessment } = get();
    if (!user || !assessment) return;
    
    try {
      // Update locally first
      set({
        assessment: {
          ...assessment,
          ability: {
            answers: [],
            currentQuestionIndex: 0,
            results: []
          }
        }
      });
      
      // Then update in Firestore
      await updateAbilityAnswers(user.uid, [], 0);
      await updateAbilityResults(user.uid, []);
    } catch (error) {
      console.error('Error resetting ability assessment:', error);
      set({ error: error as Error });
    }
  },
  
  // Knowledge assessment methods
  setKnowledgeAnswer: async (answer) => {
    const { user, assessment } = get();
    if (!user || !assessment) return;
    
    try {
      // Update locally first
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
      
      // Then update in Firestore
      await updateKnowledgeAnswers(user.uid, updatedAnswers);
    } catch (error) {
      console.error('Error setting knowledge answer:', error);
      set({ error: error as Error });
    }
  },
  
  setKnowledgeResults: async (results, subset) => {
    const { user, assessment } = get();
    if (!user || !assessment) return;
    
    try {
      // Filter out results with the same subset and add the new ones
      const updatedResults = [
        ...assessment.knowledge.results.filter(r => r.subset !== subset),
        ...results.map(item => ({ ...item, subset: subset }))
      ];
      
      // Update locally first
      set({
        assessment: {
          ...assessment,
          knowledge: {
            ...assessment.knowledge,
            results: updatedResults
          }
        }
      });
      
      // Then update in Firestore
      await updateKnowledgeResults(user.uid, updatedResults);
    } catch (error) {
      console.error('Error setting knowledge results:', error);
      set({ error: error as Error });
    }
  },
  
  resetKnowledgeAssessment: async () => {
    const { user, assessment } = get();
    if (!user || !assessment) return;
    
    try {
      // Update locally first
      set({
        assessment: {
          ...assessment,
          knowledge: {
            ...assessment.knowledge,
            answers: [],
            results: []
          }
        }
      });
      
      // Then update in Firestore
      await updateKnowledgeAnswers(user.uid, []);
      await updateKnowledgeResults(user.uid, []);
    } catch (error) {
      console.error('Error resetting knowledge assessment:', error);
      set({ error: error as Error });
    }
  },
  
  // Skills assessment methods
  setSkillAnswer: async (answer) => {
    const { user, assessment } = get();
    if (!user || !assessment) return;
    
    try {
      // Update locally first
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
      
      // Then update in Firestore
      await updateSkillAnswers(user.uid, updatedAnswers);
    } catch (error) {
      console.error('Error setting skill answer:', error);
      set({ error: error as Error });
    }
  },
  
  setSkillResults: async (results, subset) => {
    const { user, assessment } = get();
    if (!user || !assessment) return;
    
    try {
      // Filter out results with the same subset and add the new ones
      const updatedResults = [
        ...assessment.skills.results.filter(r => r.subset !== subset),
        ...results.map(item => ({ ...item, subset: subset }))
      ];
      
      // Update locally first
      set({
        assessment: {
          ...assessment,
          skills: {
            ...assessment.skills,
            results: updatedResults
          }
        }
      });
      
      // Then update in Firestore
      await updateSkillResults(user.uid, updatedResults);
    } catch (error) {
      console.error('Error setting skill results:', error);
      set({ error: error as Error });
    }
  },
  
  resetSkillAssessment: async () => {
    const { user, assessment } = get();
    if (!user || !assessment) return;
    
    try {
      // Update locally first
      set({
        assessment: {
          ...assessment,
          skills: {
            ...assessment.skills,
            answers: [],
            results: []
          }
        }
      });
      
      // Then update in Firestore
      await updateSkillAnswers(user.uid, []);
      await updateSkillResults(user.uid, []);
    } catch (error) {
      console.error('Error resetting skill assessment:', error);
      set({ error: error as Error });
    }
  },
  
  // Career recommendations
  setCareerRecommendations: async (recommendations) => {
    const { user, assessment } = get();
    if (!user || !assessment) return;
    
    try {
      // Update locally first
      set({
        assessment: {
          ...assessment,
          careerRecommendations: recommendations
        }
      });
      
      // Then update in Firestore
      await updateCareerRecommendations(user.uid, recommendations);
    } catch (error) {
      console.error('Error setting career recommendations:', error);
      set({ error: error as Error });
    }
  },
  
  // Global reset
  resetAllAssessments: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      // Create a new empty assessment
      await initializeAssessment(user.uid);
    } catch (error) {
      console.error('Error resetting all assessments:', error);
      set({ error: error as Error });
    }
  }
}));

// Helper function to initialize the store
export const initializeFirebaseAssessment = () => {
  useFirebaseAssessmentStore.getState().initialize();
};
