import React, {
  Suspense,
  useEffect,
  createContext,
  useContext,
  useReducer,
  ReactNode,
} from "react";
import { initializeFirebaseAssessment } from "utils/firebase-assessment-store";
import { Toaster } from "sonner";
import { ErrorBoundary } from "components/ErrorBoundary";

// --- STATE MANAGEMENT LOGIC ---

// 1. Type Definitions
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
  type: "interests" | "abilities" | "knowledge" | "skills";
  questions: Question[];
  progress: number;
}

export interface AssessmentResult {
  category: string;
  score: number;
  description:string;
}

interface AppState {
  user: User | null;
  currentAssessment: Assessment | null;
  isLoading: boolean;
  error: string | null;
  assessmentProgress: {
    interests: number;
    abilities: number;
    knowledge: number;
    skills: number;
  };
}

type AppAction =
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "UPDATE_PROGRESS"; payload: { type: string; progress: number } }
  | { type: "START_ASSESSMENT"; payload: Assessment }
  | { type: "RESET_STATE" };

// 2. Initial State and Reducer
const initialState: AppState = {
  user: null,
  currentAssessment: null,
  isLoading: false,
  error: null,
  assessmentProgress: {
    interests: 0,
    abilities: 0,
    knowledge: 0,
    skills: 0,
  },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload, error: null };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    case "UPDATE_PROGRESS":
      return {
        ...state,
        assessmentProgress: {
          ...state.assessmentProgress,
          [action.payload.type]: action.payload.progress,
        },
      };
    case "START_ASSESSMENT":
      return {
        ...state,
        currentAssessment: action.payload,
        error: null,
      };
    case "RESET_STATE":
      return initialState;
    default:
      return state;
  }
}

// 3. Context and Hook
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

// --- APP PROVIDER COMPONENT ---

interface Props {
  children: React.ReactNode;
}

/**
 * This is the main provider for the app.
 * It now includes the global state management logic.
 */
export const AppProvider = ({ children }: Props) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    initializeFirebaseAssessment();
  }, []);

  return (
    <ErrorBoundary>
      <AppContext.Provider value={{ state, dispatch }}>
        <Suspense fallback={<div>Loading...</div>}>
          <Toaster position="top-right" richColors />
          {children}
        </Suspense>
      </AppContext.Provider>
    </ErrorBoundary>
  );
};
