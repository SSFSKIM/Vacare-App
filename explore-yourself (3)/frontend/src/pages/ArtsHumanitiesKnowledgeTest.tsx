import React, { useState, useEffect } from "react";
import { NavigationBar } from "../components/NavigationBar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Loader2 } from "lucide-react";
import brain from "brain";
import { KnowledgeAnswerGrid } from "../components/KnowledgeAnswerGrid";
import { useInitializeFirebaseStore, useKnowledgeTestStore } from "../utils/test-migration-helper";

const STORAGE_KEY = 'arts_humanities_knowledge_test_progress';

export default function ArtsHumanitiesKnowledgeTest() {
  const [answers, setAnswers] = useState<{[key: number]: number}>(() => {
    // Load saved answers from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();
  
  // Initialize Firebase assessment store
  useInitializeFirebaseStore();
  
  // Get migration-compatible store functions
  const { setKnowledgeResults, storeLoading, storeError } = useKnowledgeTestStore('arts-humanities-knowledge');

  // Calculate progress
  const progress = questions.length > 0
    ? (Object.keys(answers).length / questions.length) * 100
    : 0;

  React.useEffect(() => {
    const savedAnswers = localStorage.getItem('arts-humanities-knowledge-answers');
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('arts-humanities-knowledge-answers', JSON.stringify(answers));
  }, [answers]);

  React.useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await brain.get_knowledge_questions();
        const data = await response.json();
        // Filter only arts and humanities questions
        const artsHumanitiesQuestions = data.filter((q: any) => [
          "Philosophy and Theology",
          "Foreign Language",
          "English Language",
          "History and Archeology",
          "Fine Arts"
        ].includes(q.name));
        setQuestions(artsHumanitiesQuestions);
      } catch (err) {
        setError("Failed to load questions. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleAnswerChange = (questionId: number, value: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    toast.success(`Rated: ${value}`);
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error("Please answer all questions before submitting.");
      return;
    }

    try {
      // Calculate results for this subset
      const response = await brain.calculate_knowledge_results({
        answers: Object.entries(answers).map(([questionId, rating]) => ({
          questionId: parseInt(questionId),
          rating
        }))
      });
      const responseData = await response.json();
      
      // Add subset to each result
      const resultsWithSubset = {
        ...responseData,
        results: responseData.results.map((r: any) => ({
          ...r,
          subset: 'arts & humanities'
        }))
      };
      
      // Store the results
      await setKnowledgeResults(resultsWithSubset);
      
      // Clear local storage
      localStorage.removeItem('arts-humanities-knowledge-answers');
      
      navigate("/knowledge-selection");
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to submit answers. Please try again.");
      toast.error("Failed to submit answers. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">Loading questions...</div>
        </main>
      </div>
    );
  }

  if (error || storeError) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center text-red-500">{error || storeError?.message || "An unexpected error occurred"}</div>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => navigate("/knowledge-selection")} variant="outline">
              Return to Knowledge Selection
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Arts and Humanities Knowledge Assessment</h1>
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span>{Math.round(progress)}% complete</span>
              <span>{Object.keys(answers).length} of {questions.length} questions answered</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
          <p className="text-lg text-muted-foreground mb-8 text-center">
            Rate your interest in developing each arts and humanities knowledge area on a scale from 10 to 100.
            Don't focus on your current level, but rather how passionate you would be to improve in these areas.
          </p>

          <div className="space-y-8">
            {questions.map((question, index) => (
              <Card key={question.id} className={`p-6 relative ${answers[question.id] !== undefined ? 'border-primary' : ''}`}>
                {answers[question.id] !== undefined && (
                  <div className="absolute top-4 right-4">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-xl font-semibold mb-2">
                    {index + 1}. {question.name}
                  </h3>
                  <p className="text-muted-foreground mb-4">{question.description}</p>
                  <div className="pl-4 space-y-2 mb-6">
                    <p><strong>Level {question.levels[0]}:</strong> {question.examples[0]}</p>
                    <p><strong>Level {question.levels[1]}:</strong> {question.examples[1]}</p>
                    <p><strong>Level {question.levels[2]}:</strong> {question.examples[2]}</p>
                  </div>
                </div>

                <KnowledgeAnswerGrid 
                  questionId={question.id} 
                  currentAnswer={answers[question.id]} 
                  onAnswerChange={handleAnswerChange} 
                />
              </Card>
            ))}
          </div>

          <div className="mt-8 flex justify-center gap-4">
            {progress > 0 && progress < 100 && (
              <Button 
                variant="outline" 
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear your progress?')) {
                    setAnswers({});
                    localStorage.removeItem('arts-humanities-knowledge-answers');
                  }
                }}
                disabled={storeLoading}
              >
                Clear Progress
              </Button>
            )}
            <Button 
              size="lg" 
              onClick={handleSubmit} 
              disabled={storeLoading || Object.keys(answers).length < questions.length}
            >
              {storeLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Submit Answers"
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
