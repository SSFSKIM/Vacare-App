
import React, { useState } from "react";
import { NavigationBar } from "../components/NavigationBar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";
import brain from "brain";
import { useNavigate } from "react-router-dom";
import { useAbilityTestStore, useInitializeFirebaseStore } from "../utils/test-migration-helper";

export default function PhysicalAbilityTest() {
  // Initialize Firebase assessment store
  useInitializeFirebaseStore();

  // Get store handlers for ability test
  const { setAbilityResults, storeLoading: firebaseLoading, storeError: firebaseError } = useAbilityTestStore('physical-ability');

  const [answers, setAnswers] = useState<{[key: number]: number}>({});
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();

  // Calculate progress
  const progress = questions.length > 0
    ? (Object.keys(answers).length / questions.length) * 100
    : 0;

  React.useEffect(() => {
    const savedAnswers = localStorage.getItem('physical-ability-answers');
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers));
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('physical-ability-answers', JSON.stringify(answers));
  }, [answers]);

  React.useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await brain.get_ability_questions();
        const data = await response.json();
        // Filter only physical questions
        const physicalQuestions = data.filter((q: any) => q.category === "Physical");
        setQuestions(physicalQuestions);
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
    const subset = 'physical';

    if (Object.keys(answers).length < questions.length) {
      toast.error("Please answer all questions before submitting.");
      return;
    }

    try {
      // Convert answers to the expected format
      const answersToSubmit = Object.entries(answers).map(([questionId, rating]) => ({
        questionId: parseInt(questionId),
        rating
      }));

      // Submit answers to the API
      const response = await brain.calculate_ability_results({
        answers: answersToSubmit,
        subset,
      });
      const responseData = await response.json();
      
      // Store results in Firebase
      const success = await setAbilityResults(responseData);
      
      if (success) {
        toast.success("Physical abilities results saved successfully!");
        // Clear local storage after successful submission
        localStorage.removeItem('physical-ability-answers');
        // Navigate to ability selection page
        navigate('/ability-selection');
      } else {
        setError("Failed to save results. Please try again.");
      }
    } catch (err) {
      console.error("Error submitting answers:", err);
      setError("Failed to submit answers. Please try again.");
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

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center text-red-500">{error}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Physical Abilities Assessment</h1>
          <div className="mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span>{Math.round(progress)}% complete</span>
              <span>{Object.keys(answers).length} of {questions.length} questions answered</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
          <p className="text-lg text-muted-foreground mb-8 text-center">
            Rate your interest in developing each physical ability on a scale from 10 to 100.
            Focus on how eager you would be to improve these abilities, not your current proficiency.
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

                <div className="space-y-2">
                  {/* First row: 10-50 */}
                  <div className="grid grid-cols-5 gap-2">
                    {[10, 20, 30, 40, 50].map((value) => (
                      <Button
                        key={value}
                        variant={answers[question.id] === value ? 'default' : 'outline'}
                        onClick={() => handleAnswerChange(question.id, value)}
                        className="p-2 h-auto flex flex-col gap-1"
                        size="sm"
                      >
                        <span>{value}</span>
                        {value === 10 && <span className="text-xs">Low</span>}
                        {value === 30 && <span className="text-xs">Medium</span>}
                        {value === 50 && <span className="text-xs">High</span>}
                      </Button>
                    ))}
                  </div>
                  
                  {/* Second row: 60-100 */}
                  <div className="grid grid-cols-5 gap-2">
                    {[60, 70, 80, 90, 100].map((value) => (
                      <Button
                        key={value}
                        variant={answers[question.id] === value ? 'default' : 'outline'}
                        onClick={() => handleAnswerChange(question.id, value)}
                        className="p-2 h-auto flex flex-col gap-1"
                        size="sm"
                      >
                        <span>{value}</span>
                        {value === 70 && <span className="text-xs">Very High</span>}
                        {value === 100 && <span className="text-xs">Exceptional</span>}
                      </Button>
                    ))}
                  </div>
                </div>
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
                    localStorage.removeItem('physical-ability-answers');
                  }
                }}
              >
                Clear Progress
              </Button>
            )}
            <Button size="lg" onClick={handleSubmit}>
              Submit Answers
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
