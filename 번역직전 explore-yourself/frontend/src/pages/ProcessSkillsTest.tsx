import React, { useState } from "react";
import { NavigationBar } from "../components/NavigationBar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import brain from "brain";
import { useNavigate } from "react-router-dom";
import { useInitializeFirebaseStore, useSkillTestStore } from "../utils/test-migration-helper";

const processSkills = [
  "Active Learning",
  "Critical Thinking",
  "Learning Strategies",
  "Monitoring"
];

export default function ProcessSkillsTest() {
  const [answers, setAnswers] = useState<{[key: number]: number}>({});
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();
  
  // Initialize Firebase store
  useInitializeFirebaseStore();
  
  // Get migration-compatible store functions
  const { setSkillResults, storeLoading, storeError } = useSkillTestStore('process');

  React.useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await brain.get_skill_questions();
        const data = await response.json();
        // Filter questions for process skills only
        const processQuestions = data.filter((q: any) => processSkills.includes(q.name));
        setQuestions(processQuestions);
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
          subset: 'process'
        }))
      };
      
      // Store the results
      console.log('Setting skill results for process:', resultsWithSubset);
      await setSkillResults(resultsWithSubset);
      
      navigate("/skill-selection");
    } catch (err) {
      console.error('Error submitting process skills test:', err);
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
    const errorMessage = error || (storeError ? storeError.message : null);
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center text-red-500">{errorMessage}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Process Skills Assessment</h1>
          <p className="text-lg text-muted-foreground mb-8 text-center">
            Rate your interest in developing each process skill on a scale from 10 to 100.
            Focus on how motivated you would be to cultivate these skills in the future, not your current proficiency.
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

          <div className="mt-8 flex justify-center">
            <Button size="lg" onClick={handleSubmit}>
              Submit Answers
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
