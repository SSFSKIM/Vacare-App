import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Answer,
  AbilityAnswer,
  AssessmentResult,
  AbilitySubsetResult,
  KnowledgeSubsetResult,
  SkillSubsetResult,
  CareerRecommendations,
  AssessmentResultsSummary,
} from '@/types';

type Results = AssessmentResultsSummary;

type SubsetResults<T> = T[] | { results?: T[] | null } | null | undefined;

const extractSubsetResults = <T extends { subset: string }>(
  payload: SubsetResults<T>,
  subset: string
): T[] => {
  if (Array.isArray(payload)) {
    return payload.map((item) => ({ ...item, subset: item.subset ?? subset }))
  }

  if (payload && typeof payload === 'object' && 'results' in payload) {
    const maybeResults = (payload as { results?: T[] | null }).results
    if (Array.isArray(maybeResults)) {
      return maybeResults.map((item) => ({ ...item, subset: item.subset ?? subset }))
    }
  }

  return []
}

interface AssessmentStore {
  // User
  userName: string | null;
  setUserName: (name: string | null) => void;

  // Results
  results: Results;
  setInterestResults: (results: AssessmentResult[] | null | undefined) => void;
  setAbilityResults: (results: SubsetResults<AbilitySubsetResult>, subset: string) => void;
  setKnowledgeResults: (results: SubsetResults<KnowledgeSubsetResult>, subset: string) => void;
  setSkillResults: (results: SubsetResults<SkillSubsetResult>, subset: string) => void;
  setCareerRecommendations: (recommendations: CareerRecommendations | null) => void;
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
          interest: results ?? []
        }
      })),
      setAbilityResults: (results, subset) => set((state) => ({
        results: {
          ...state.results,
          ability: [
            ...state.results.ability.filter((r) => r.subset !== subset),
            ...extractSubsetResults(results, subset)
          ]
        }
      })),
      setKnowledgeResults: (results, subset) => set((state) => ({
        results: {
          ...state.results,
          knowledge: [
            ...state.results.knowledge.filter((r) => r.subset !== subset),
            ...extractSubsetResults(results, subset)
          ]
        }
      })),
      setCareerRecommendations: (recommendations) => set((state) => ({
        results: {
          ...state.results,
          careerRecommendations: recommendations ?? null
        }
      })),
      setSkillResults: (results, subset) => set((state) => ({
        results: {
          ...state.results,
          skills: [
            ...state.results.skills.filter((r) => r.subset !== subset),
            ...extractSubsetResults(results, subset)
          ]
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
      }) as unknown as AssessmentStore
    }
  )
);
