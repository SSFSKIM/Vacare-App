import React, { useState } from "react";
import { NavigationBar } from "../components/NavigationBar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import brain from "brain";
import { useNavigate } from "react-router-dom";
import { useInitializeFirebaseStore, useSkillTestStore } from "../utils/test-migration-helper";

const complexProblemSolvingSkills = [
  "Complex Problem Solving"
];

export default function ComplexProblemSolvingSkillsTest() {
  // Initialize Firebase assessment store
  useInitializeFirebaseStore();
  
  const [answers, setAnswers] = useState<{[key: number]: number}>({});
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();
  
  // Get migration-compatible store functions
  const { setSkillResults, storeLoading, storeError } = useSkillTestStore('complex problem solving');

  React.useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await brain.get_skill_questions();
        const data = await response.json();
        const filteredQuestions = data.filter((q: any) => 
          complexProblemSolvingSkills.includes(q.name)
        );
        setQuestions(filteredQuestions);
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
      const response = await brain.calculate_skill_results({
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
          subset: 'complex problem solving'
        }))
      };
      
      // Store the results
      console.log('Setting skill results for complex problem solving:', resultsWithSubset);
      await setSkillResults(resultsWithSubset);
      
      navigate("/skill-selection");
    } catch (err) {
      console.error('Error submitting complex problem solving skills test:', err);
      setError("Failed to submit answers. Please try again.");
    }
  };

  if (loading || storeLoading) {
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
    const displayError = error || storeError;
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center text-red-500">{displayError?.message || error}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Complex Problem Solving Skills Assessment</h1>
          <p className="text-lg text-muted-foreground mb-8 text-center">
            Rate your interest in developing complex problem solving skills on a scale from 10 to 100.
            Consider how motivated you would be to improve these skills rather than your current ability.
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
            <Button size="lg" onClick={handleSubmit}>
              Submit Answers
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
