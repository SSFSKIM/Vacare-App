// ui/src/utils/types.ts
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Question {
  id: number;
  text: string;
  category: string;
}

export interface Answer {
  questionId: number;
  rating: number;
}

export interface Assessment {
  id: string;
  type: 'interests' | 'abilities' | 'knowledge' | 'skills';
  questions: Question[];
  progress: number;
}

export interface AssessmentResult {
  category: string;
  score: number;
  description: string;
}
