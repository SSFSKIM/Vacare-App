import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NavigationBar } from '../components/NavigationBar';
import { useFirebaseAssessmentStore, initializeFirebaseAssessment } from '../utils/firebase-assessment-store';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import brain from 'brain';

export default function Assessment() {
  // Initialize Firebase assessment store
  useEffect(() => {
    initializeFirebaseAssessment();
  }, []);
  
  const navigate = useNavigate();
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const testType = searchParams.get('type') || 'interest';
  
  // 직접 state 관리 - useApi 제거
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  
  // Get assessment data from Firebase store
  const { 
    assessment,
    isLoading: storeLoading,
    error: storeError,
    setInterestAnswer,
    setInterestQuestionIndex,
    setInterestResults
  } = useFirebaseAssessmentStore();
  
  // Extract interest assessment data
  const currentQuestionIndex = assessment?.interest?.currentQuestionIndex || 0;
  const answers = assessment?.interest?.answers || [];

  // Calculate page size and current page
  const questionsPerPage = 5;
  const currentPage = Math.floor(currentQuestionIndex / questionsPerPage);
  const totalPages = Math.ceil(questions.length / questionsPerPage) || 0;
  
  // Get current page questions
  const getCurrentPageQuestions = () => {
    const startIndex = currentPage * questionsPerPage;
    const endIndex = Math.min(startIndex + questionsPerPage, questions.length);
    return questions.slice(startIndex, endIndex);
  };

  // Redirect to home if test type is not interest (since others are not available yet)
  useEffect(() => {
    if (testType !== 'interest') {
      navigate('/');
    }
  }, [testType, navigate]);

  // 직접 brain API 호출 - useApi 제거
  useEffect(() => {
    const loadQuestions = async () => {
      setQuestionsLoading(true);
      setQuestionsError(null);
      
      try {
        // Interest assessment는 brain.get_questions() 사용
        const response = await brain.get_questions();
        const data = await response.json();
        
        if (Array.isArray(data)) {
          setQuestions(data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error loading questions:', error);
        setQuestionsError('Failed to load questions. Please try again.');
      } finally {
        setQuestionsLoading(false);
      }
    };

    loadQuestions();
  }, []);

  const handleRating = async (questionId: string, rating: number) => {
    try {
      await setInterestAnswer({ questionId, rating });
    } catch (error) {
      console.error('Error setting answer:', error);
    }
  };

  const handlePrevious = async () => {
    if (currentPage > 0) {
      const newIndex = (currentPage - 1) * questionsPerPage;
      try {
        await setInterestQuestionIndex(newIndex);
      } catch (error) {
        console.error('Error setting question index:', error);
      }
    }
  };

  const handleNext = async () => {
    const pageQuestions = getCurrentPageQuestions();
    const pageAnswered = pageQuestions.every(q => answers.some(a => a.questionId === q.id));
    
    if (!pageAnswered) {
      alert('Please answer all questions on this page before continuing.');
      return;
    }
    
    try {
      if (currentPage < totalPages - 1) {
        const newIndex = (currentPage + 1) * questionsPerPage;
        await setInterestQuestionIndex(newIndex);
      } else if (currentPage === totalPages - 1) {
        // If on last page and all questions are answered, calculate results and navigate
        if (questions.length > 0 && questions.every(q => answers.some(a => a.questionId === q.id))) {
          setResultsLoading(true);
          
          try {
            // 직접 brain API 호출로 결과 계산
            const response = await brain.calculate_results({ answers });
            const results = await response.json();
            
            // Firebase store에 결과 저장
            await setInterestResults(results.results || results);
            
            navigate('/results');
          } catch (error) {
            console.error('Error calculating results:', error);
            alert('Failed to calculate results. Please try again.');
          } finally {
            setResultsLoading(false);
          }
        } else {
          alert('Please answer all questions before submitting.');
        }
      }
    } catch (error) {
      console.error('Error in navigation:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const isLoading = questionsLoading || storeLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <LoadingSpinner message="Loading assessment..." />
          </div>
        </main>
      </div>
    );
  }

  if (questionsError || storeError) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <main className="container mx-auto px-4 py-8">
          <ErrorMessage
            message={questionsError || (storeError?.message || 'An error occurred')}
            onRetry={() => window.location.reload()}
          />
        </main>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">No Questions Available</h2>
            <p className="text-muted-foreground mb-4">
              No questions are currently available for this assessment type.
            </p>
            <Button onClick={() => navigate('/')}>
              Return to Home
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const pageQuestions = getCurrentPageQuestions();
  const progress = questions.length > 0 ? 
    (Math.min((currentPage * questionsPerPage) + pageQuestions.length, questions.length) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-6 text-center">
              Interest Explorer
            </h1>
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Page {currentPage + 1} of {totalPages}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <h2 className="text-2xl font-semibold mb-8 text-center">
            How much would you enjoy these activities?
          </h2>
          
          <div className="space-y-6">
            {pageQuestions.map((question) => (
              <Card key={question.id} className="p-4">
                <div className="text-lg mb-4 text-center">{question.text}</div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      variant={answers.some(a => a.questionId === question.id && a.rating === rating) ? 'default' : 'outline'}
                      onClick={() => handleRating(question.id, rating)}
                      className="p-2 h-auto flex flex-col gap-1"
                      size="sm"
                    >
                      <span>{rating}</span>
                      <span className="text-xs">
                        {rating === 1 ? 'Not at all' : 
                         rating === 3 ? 'Somewhat' : 
                         rating === 5 ? 'Very much' : ''}
                      </span>
                    </Button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentPage === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={resultsLoading}
            >
              {resultsLoading ? (
                <>
                  <LoadingSpinner message="" />
                  Calculating...
                </>
              ) : currentPage === totalPages - 1 ? (
                'Submit Assessment'
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}