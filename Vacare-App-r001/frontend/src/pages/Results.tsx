



import React, { useCallback, useState } from "react";
import { NavigationBar } from "../components/NavigationBar";
import { useFirebaseAssessmentStore } from "../utils/firebase-assessment-store";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InterestResults } from "components/InterestResults";
import { AbilityResults } from "components/AbilityResults";
import { KnowledgeResults } from 'components/KnowledgeResults';
import { SkillResults } from 'components/SkillResults';
import { InterestTab } from 'components/InterestTab';
import { CareerRecommendations } from "components/CareerRecommendations";
import { useApi, apiService } from "utils/useApi";
import { Button } from "@/components/ui/button";
import { useUserGuardContext } from "app";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function Results() {
  const { user } = useUserGuardContext();
  const { assessment, isLoading, error, setCareerRecommendations } =
    useFirebaseAssessmentStore();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

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

  const handleGenerateReport = async () => {
    if (!user) {
      toast.error("You must be logged in to generate a report.");
      return;
    }

    setIsGeneratingReport(true);
    toast.info("Generating your career report... This may take a moment.");

    const webhookUrl = "http://localhost:5678/webhook/generate-comprehensive-report";

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to trigger report generation.");
      }

      const reportData = await response.json();
      console.log("Received full response from n8n:", reportData);
      
      setReport(reportData.report);
      console.log("Set report state with:", reportData.report);

      setIsReportModalOpen(true);
      toast.success("Your report has been generated successfully!");
    } catch (err) {
      console.error("Failed to generate report:", err);
      toast.error("There was an error generating your report. Please try again later.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

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
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">
              Your Assessment Results
            </h1>
            <p className="text-lg text-muted-foreground">
              Explore your unique strengths and interests.
            </p>
            <Button 
              onClick={handleGenerateReport} 
              disabled={isGeneratingReport}
              className="mt-4"
            >
              {isGeneratingReport ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Generating...</span>
                </>
              ) : (
                "Generate Full Report"
              )}
            </Button>
          </div>

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

      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{report?.content?.title || "Career Development Report"}</DialogTitle>
            <DialogDescription>
              {report?.reportType} - Generated on{" "}
              {report?.generatedAt
                ? new Date(report.generatedAt).toLocaleDateString()
                : "N/A"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-4 mt-4">
            <pre className="whitespace-pre-wrap text-sm font-sans">
              {report?.content?.aiAnalysis || "Report content is not available. Please check the browser console for errors."}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
