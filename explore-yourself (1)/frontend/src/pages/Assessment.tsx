import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NavigationBar } from '../components/NavigationBar';
import { useFirebaseAssessmentStore, initializeFirebaseAssessment } from '../utils/firebase-assessment-store';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useApi, apiService } from '../utils/useApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

export default function Assessment() {
  // Initialize Firebase assessment store
  useEffect(() => {
    initializeFirebaseAssessment();
  }, []);
  const navigate = useNavigate();
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const { 
    data: questions, 
    loading: questionsLoading, 
    error: questionsError, 
    execute: fetchQuestions 
  } = useApi<any[]>();
  const { 
    data: results, 
    loading: resultsLoading, 
    error: resultsError, 
    execute: calculateResults 
  } = useApi<any>();
  
  // Get assessment data from Firebase store
  const { 
    assessment,
    isLoading: storeLoading,
    error: storeError,
    setInterestAnswer,
    setInterestQuestionIndex
  } = useFirebaseAssessmentStore();
  
  // Extract interest assessment data
  const currentQuestionIndex = assessment?.interest?.currentQuestionIndex || 0;
  const answers = assessment?.interest?.answers || [];
  const testType = searchParams.get('type') || 'interest';

  // Calculate page size and current page
  const questionsPerPage = 5;
  const currentPage = Math.floor(currentQuestionIndex / questionsPerPage);
  const totalPages = questions ? Math.ceil(questions.length / questionsPerPage) : 0;
  
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

  useEffect(() => {
    fetchQuestions(() => apiService.getQuestions('interest'));
  }, [fetchQuestions]);

  const handleRating = async (questionId: string, rating: number) => {
    await setInterestAnswer({ questionId, rating });
  };

  const handlePrevious = async () => {
    // Go to previous page if not on first page
    if (currentPage > 0) {
      const newIndex = (currentPage - 1) * questionsPerPage;
      await setInterestQuestionIndex(newIndex);
    }
  };

  const handleNext = async () => {
    // Go to next page if not on last page
    const pageQuestions = getCurrentPageQuestions();
    const pageAnswered = pageQuestions.every(q => answers.some(a => a.questionId === q.id));
    
    if (!pageAnswered) {
      alert('Please answer all questions on this page before continuing.');
      return;
    }
    
    if (currentPage < totalPages - 1) {
      const newIndex = (currentPage + 1) * questionsPerPage;
      await setInterestQuestionIndex(newIndex);
    } else if (currentPage === totalPages - 1) {
      // If on last page and all questions are answered, calculate results and navigate
      if (questions && questions.every(q => answers.some(a => a.questionId === q.id))) {
        await calculateResults(() => apiService.calculateInterestResults(answers));
        navigate('/results');
      } else {
        alert('Please answer all questions before submitting.');
      }
    }
  };

  const isLoading = questionsLoading || storeLoading;
  const isCalculating = resultsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Loading assessment..." />
      </div>
    );
  }

  if (questionsError) {
    return (
      <ErrorMessage
        message={questionsError}
        onRetry={() => fetchQuestions(() => apiService.getQuestions('interest'))}
      />
    );
  }

  const pageQuestions = getCurrentPageQuestions();
  const progress = questions ? (Math.min((currentPage * questionsPerPage) + pageQuestions.length, questions.length) / questions.length) * 100 : 0;

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
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Previous
            </Button>
            <Button 
              onClick={handleNext} 
              className="flex items-center gap-2"
              disabled={isCalculating}
            >
              {isCalculating ? 'Calculating...' : currentPage === totalPages - 1 ? 'Finish' : 'Next'}
              {currentPage < totalPages - 1 && <ArrowRight size={16} />}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
