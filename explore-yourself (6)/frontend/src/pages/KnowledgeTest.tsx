import React, { useState } from "react";
import { NavigationBar } from "../components/NavigationBar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import brain from "brain";
import { KnowledgeAnswerGrid } from "../components/KnowledgeAnswerGrid";
import { useTranslation } from "react-i18next";

export default function KnowledgeTest() {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await brain.get_knowledge_questions();
        const data = await response.json();
        setQuestions(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(t("knowledgeTests.common.loadError"));
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [t]);

  const handleAnswerChange = (questionId: number, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
    toast.success(t("knowledgeTests.common.toastRated", { value }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error(t("knowledgeTests.common.submitIncomplete"));
      return;
    }

    try {
      const response = await brain.calculate_knowledge_results({
        answers: Object.entries(answers).map(([questionId, rating]) => ({
          questionId: parseInt(questionId, 10),
          rating,
        })),
      });
      await response.json();
      // TODO: Navigate to results page with the results
    } catch (err) {
      setError(t("knowledgeTests.common.submitError"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">{t("knowledgeTests.common.loading")}</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center text-red-500">
            {error || t("knowledgeTests.common.unexpectedError")}
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
          <h1 className="text-4xl font-bold mb-8 text-center">{t("knowledgeTests.generic.title")}</h1>
          <p className="text-lg text-muted-foreground mb-8 text-center">
            {t("knowledgeTests.generic.instructions.line1")}<br />
            {t("knowledgeTests.generic.instructions.line2")}
          </p>

          <div className="space-y-8">
            {questions.map((question, index) => (
              <Card
                key={question.id}
                className={`p-6 relative ${answers[question.id] !== undefined ? "border-primary" : ""}`}
              >
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
                    <p>
                      <strong>{t("knowledgeTests.common.levelLabel", { level: question.levels[0] })}</strong>{" "}
                      {question.examples[0]}
                    </p>
                    <p>
                      <strong>{t("knowledgeTests.common.levelLabel", { level: question.levels[1] })}</strong>{" "}
                      {question.examples[1]}
                    </p>
                    <p>
                      <strong>{t("knowledgeTests.common.levelLabel", { level: question.levels[2] })}</strong>{" "}
                      {question.examples[2]}
                    </p>
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

          <div className="mt-8 flex justify-center">
            <Button size="lg" onClick={handleSubmit}>
              {t("knowledgeTests.common.submit")}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
