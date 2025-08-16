import { useState, useCallback } from 'react';
import { useAppContext } from 'components/AppProvider';

// Note: The Answer type should be imported from a shared types file
// if it's not already available in AppProvider.
// For now, we'll assume it's accessible.
interface Answer {
  questionId: number;
  rating: number;
}

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ApiOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

export function useApi<T>() {
  const { dispatch } = useAppContext();
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const execute = useCallback(async (
    apiCall: () => Promise<T>,
    options: ApiOptions = {}
  ) => {
    const { retries = 3, retryDelay = 1000, timeout = 10000 } = options;
    
    setState({ data: null, loading: true, error: null });
    dispatch({ type: 'SET_LOADING', payload: true });

    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        );
        
        const result = await Promise.race([apiCall(), timeoutPromise]);
        
        setState({ data: result, loading: false, error: null });
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_ERROR', payload: null });
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        }
      }
    }

    const errorMessage = getErrorMessage(lastError!);
    setState({ data: null, loading: false, error: errorMessage });
    dispatch({ type: 'SET_LOADING', payload: false });
    dispatch({ type: 'SET_ERROR', payload: errorMessage });
    
    throw lastError!;
  }, [dispatch]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

function getErrorMessage(error: Error): string {
  if (error.message === 'Request timeout') {
    return 'Server response timeout. Please try again later.';
  }
  
  if (error.message.includes('Network Error')) {
    return 'Please check your network connection.';
  }
  
  if (error.message.includes('500')) {
    return 'A temporary server issue has occurred. Please try again later.';
  }
  
  return 'An error has occurred. Please try again.';
}

// API service functions using the generated 'brain' client
import brain from 'brain';

export const apiService = {
  async getQuestions(type: 'interest' | 'ability' | 'knowledge' | 'skill') {
    // This is an example. You'll need to replace 'get_knowledge_questions'
    // with the actual brain methods for each assessment type.
    switch (type) {
      case 'interest':
        // Assuming an endpoint exists, e.g., brain.get_interest_questions()
        // return await brain.get_interest_questions(); 
        return Promise.reject("Endpoint not implemented");
      case 'ability':
        return await brain.get_ability_questions();
      case 'knowledge':
        return await brain.get_knowledge_questions();
      case 'skill':
        return await brain.get_skill_questions();
      default:
        throw new Error("Invalid assessment type");
    }
  },

  async calculateResults(type: 'interest' | 'ability' | 'knowledge' | 'skill', answers: Answer[]) {
    // This is an example. You'll need to replace 'calculate_knowledge_results'
    // with the actual brain methods for each assessment type.
    const body = { answers };
    switch (type) {
        case 'interest':
            return await brain.calculate_results(body);
        case 'ability':
            return await brain.calculate_ability_results(body);
        case 'knowledge':
            return await brain.calculate_knowledge_results(body);
        case 'skill':
            return await brain.calculate_skill_results(body);
        default:
            throw new Error("Invalid assessment type");
    }
  },

  async analyzeCareerMatches(data: Record<string, any>) {
    return await brain.analyze_results(data);
  },
};
