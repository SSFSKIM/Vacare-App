import React, { useCallback } from "react";
import { NavigationBar } from "../components/NavigationBar";
import { useFirebaseAssessmentStore } from "../utils/firebase-assessment-store";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InterestResults } from "components/InterestResults";
import { AbilityResults } from "components/AbilityResults";
import { KnowledgeResults } from "components/KnowledgeResults";
import { SkillResults } from "components/SkillResults";
import { CareerRecommendations } from "components/CareerRecommendations";
import { useApi, apiService } from "utils/useApi";

export default function Results() {
  const { assessment, isLoading, error, setCareerRecommendations } =
    useFirebaseAssessmentStore();

  const {
    isLoading: isAnalyzing,
    error: analysisError,
    execute: analyze,
  } = useApi();

  const handleAnalyzeCareers = useCallback(async () => {
    if (!assessment) return;

    const { interest, ability, knowledge, skills } = assessment;

    // Ensure we have results to analyze
    if (
      interest.results.length === 0 &&
      ability.results.length === 0 &&
      knowledge.results.length === 0 &&
      skills.results.length === 0
    ) {
      console.log("No assessment results to analyze.");
      return;
    }

    try {
      const response = await analyze(() =>
        apiService.analyzeCareerMatches({
          interests: interest.results.map((r) => ({
            name: r.name,
            score: r.score,
          })),
          abilities: ability.results.map((r) => ({
            name: r.name,
            score: r.score,
          })),
          knowledge: knowledge.results.map((r) => ({
            name: r.name,
            score: r.score,
          })),
          skills: skills.results.map((r) => ({ name: r.name, score: r.score })),
        })
      );
      setCareerRecommendations(response);
    } catch (err) {
      console.error("Failed to analyze career matches:", err);
    }
  }, [assessment, analyze, setCareerRecommendations]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Loading your results..." />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (!assessment) {
    return (
      <div className="min-h-screen">
        <NavigationBar />
        <main className="container mx-auto px-4 py-8 text-center">
          <p>Please complete an assessment to see your results.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold mb-2 text-center">
            Your Assessment Results
          </h1>
          <p className="text-lg text-muted-foreground mb-8 text-center">
            Explore your unique strengths and interests.
          </p>

          <Tabs defaultValue="interest" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="interest">Interest</TabsTrigger>
              <TabsTrigger value="ability">Ability</TabsTrigger>
              <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="careers">Career Matches</TabsTrigger>
            </TabsList>

            <TabsContent value="interest" className="mt-4">
              <InterestResults results={assessment.interest.results} />
            </TabsContent>
            <TabsContent value="ability" className="mt-4">
              <AbilityResults results={assessment.ability.results} />
            </TabsContent>
            <TabsContent value="knowledge" className="mt-4">
              <KnowledgeResults results={assessment.knowledge.results} />
            </TabsContent>
            <TabsContent value="skills" className="mt-4">
              <SkillResults results={assessment.skills.results} />
            </TabsContent>
            <TabsContent value="careers" className="mt-4">
              <CareerRecommendations
                recommendations={assessment.careerRecommendations}
                onAnalyze={handleAnalyzeCareers}
                isLoading={isAnalyzing}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
