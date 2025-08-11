import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Answer, AbilityAnswer, CareerMatch } from 'brain/data-contracts';

interface AssessmentResult {
  name: string;
  score: number;
  level: string;
  description?: string;
}

interface KnowledgeSubsetResult extends Omit<AssessmentResult, 'level'> {
  level?: string;
  subset: string;
}

interface CareerRecommendations {
  matches: CareerMatch[];
  category: string;
}

interface AbilitySubsetResult extends Omit<AssessmentResult, 'level'> {
  level?: string;
  subset: string;
}

interface SkillSubsetResult extends Omit<AssessmentResult, 'level'> {
  level?: string;
  subset: string;
}

interface Results {
  interest: AssessmentResult[];
  ability: AbilitySubsetResult[];
  knowledge: KnowledgeSubsetResult[];
  skills: SkillSubsetResult[];
  careerRecommendations: CareerRecommendations | null;
}

interface AssessmentStore {
  // User
  userName: string | null;
  setUserName: (name: string | null) => void;

  // Results
  results: Results;
  setInterestResults: (results: any) => void;
  setAbilityResults: (results: any, subset: string) => void;
  setKnowledgeResults: (results: any, subset: string) => void;
  setSkillResults: (results: any, subset: string) => void;
  setCareerRecommendations: (recommendations: CareerRecommendations) => void;
  resetResults: () => void;
  resetAllResults: () => void;

  // Knowledge Assessment
  knowledgeAnswers: Answer[];
  setKnowledgeAnswer: (answer: Answer) => void;
  resetKnowledgeAssessment: () => void;

  // Skills Assessment
  skillAnswers: Answer[];
  setSkillAnswer: (answer: Answer) => void;
  resetSkillAssessment: () => void;

  // Interest Assessment
  currentQuestionIndex: number;
  answers: Answer[];
  setCurrentQuestionIndex: (index: number) => void;
  setAnswer: (answer: Answer) => void;
  resetAssessment: () => void;

  // Ability Assessment
  currentAbilityIndex: number;
  abilityAnswers: AbilityAnswer[];
  setCurrentAbilityIndex: (index: number) => void;
  setAbilityAnswer: (answer: AbilityAnswer) => void;
  resetAbilityAssessment: () => void;
}

export const useAssessmentStore = create(
  persist<AssessmentStore>(
    (set) => ({
      // User
      userName: null,
      setUserName: (name) => set({ userName: name }),

      // Results
      results: {
        interest: [],
        ability: [],
        knowledge: [],
        skills: [],
        careerRecommendations: null
      },
      setInterestResults: (results) => set((state) => ({
        results: {
          ...state.results,
          interest: results || []
        }
      })),
      setAbilityResults: (results, subset) => set((state) => ({
        results: {
          ...state.results,
          ability: [
            ...state.results.ability.filter(r => r.subset !== subset),
            ...(results.results || []).map((r: any) => ({ ...r, subset }))
          ]
        }
      })),
      // Deprecated - remove after migration
      _setAbilityResults: (results) => set((state) => ({
        results: {
          ...state.results,
          ability: results.results || []
        }
      })),
      setKnowledgeResults: (results, subset) => set((state) => ({
        results: {
          ...state.results,
          knowledge: [
            ...state.results.knowledge.filter(r => r.subset !== subset),
            ...(results.results || []).map((r: any) => ({ ...r, subset }))
          ]
        }
      })),
      setCareerRecommendations: (recommendations) => set((state) => ({
        results: {
          ...state.results,
          careerRecommendations: recommendations
        }
      })),
      setSkillResults: (results, subset) => set((state) => ({
        results: {
          ...state.results,
          skills: [
            ...state.results.skills.filter(r => r.subset !== subset),
            ...(results.results || []).map((r: any) => ({ ...r, subset }))
          ]
        }
      })),
      // Deprecated - remove after migration
      _setSkillResults: (results) => set((state) => ({
        results: {
          ...state.results,
          skills: results.results || []
        }
      })),
      resetResults: () => set((state) => ({
        results: {
          ...state.results,
          interest: [],
          careerRecommendations: null
        }
      })),
      
      resetAllResults: () => set({
        results: {
          interest: [],
          ability: [],
          knowledge: [],
          skills: [],
          careerRecommendations: null
        },
        // Also reset all assessment data
        currentQuestionIndex: 0,
        answers: [],
        currentAbilityIndex: 0,
        abilityAnswers: [],
        knowledgeAnswers: [],
        skillAnswers: []
      }),

      // Knowledge Assessment
      knowledgeAnswers: [],
      setKnowledgeAnswer: (answer) =>
        set((state) => ({
          knowledgeAnswers: [
            ...state.knowledgeAnswers.filter((a) => a.questionId !== answer.questionId),
            answer,
          ],
        })),
      resetKnowledgeAssessment: () => set({ knowledgeAnswers: [] }),

      // Skills Assessment
      skillAnswers: [],
      setSkillAnswer: (answer) =>
        set((state) => ({
          skillAnswers: [
            ...state.skillAnswers.filter((a) => a.questionId !== answer.questionId),
            answer,
          ],
        })),
      resetSkillAssessment: () => set({ skillAnswers: [] }),

      // Interest Assessment
      currentQuestionIndex: 0,
      answers: [],
      setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
      setAnswer: (answer) =>
        set((state) => ({
          answers: [
            ...state.answers.filter((a) => a.questionId !== answer.questionId),
            answer,
          ],
        })),
      resetAssessment: () => set({ currentQuestionIndex: 0, answers: [] }),

      // Ability Assessment
      currentAbilityIndex: 0,
      abilityAnswers: [],
      setCurrentAbilityIndex: (index) => set({ currentAbilityIndex: index }),
      setAbilityAnswer: (answer) =>
        set((state) => ({
          abilityAnswers: [
            ...state.abilityAnswers.filter((a) => a.questionId !== answer.questionId),
            answer,
          ],
        })),
      resetAbilityAssessment: () => set({ currentAbilityIndex: 0, abilityAnswers: [] })
    }),
    {
      name: 'assessment-storage',
      partialize: (state) => ({
        userName: state.userName,
        results: state.results,
        answers: state.answers,
        abilityAnswers: state.abilityAnswers,
        knowledgeAnswers: state.knowledgeAnswers,
        skillAnswers: state.skillAnswers
      })
    }
  )
);
