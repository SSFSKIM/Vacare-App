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
import { Button } from "@/components/ui/button";
import { useUserGuardContext } from "app";
import { toast } from "sonner";
import brain from 'brain';
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

  // State for career analysis - replacing useApi
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

// Results.tsx에서 이 함수를 교체하세요

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

  setIsAnalyzing(true);
  setAnalysisError(null);

  try {
    // 수정된 부분: Interest는 category를 name으로 사용
    const response = await brain.analyze_multi_category({
      interests: interest.results.map((r) => ({
        name: r.category,  // 이 부분이 핵심 - category를 name으로 사용
        rating: r.score,
      })),
      abilities: ability.results.map((r) => ({
        name: r.name || r.category,
        rating: r.score,
      })),
      knowledge: knowledge.results.map((r) => ({
        name: r.name || r.category,
        rating: r.score,
      })),
      skills: skills.results.map((r) => ({
        name: r.name || r.category,
        rating: r.score,
      })),
    });

    const data = await response.json();
    setCareerRecommendations(data);
    
  } catch (err) {
    console.error("Failed to analyze career matches:", err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to analyze career matches';
    setAnalysisError(errorMessage);
    toast.error(errorMessage);
  } finally {
    setIsAnalyzing(false);
  }
}, [assessment, setCareerRecommendations]);

  const handleGenerateReport = async () => {
    if (!user) {
      toast.error("You must be logged in to generate a report.");
      return;
    }

    setIsGeneratingReport(true);
    toast.info("Generating your career report... This may take a moment.");

    try {
      // Direct brain API call for report generation if available
      // Otherwise use existing n8n webhook approach
      const webhookUrl = "https://hook.eu2.make.com/w7k6u4bxj1rtcrmqv0p31ixlrqabxcgd";
      
      const requestBody = {
        userId: user.uid,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reportData = await response.json();
      setReport(reportData);
      setIsReportModalOpen(true);
      toast.success("Report generated successfully!");
      
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Loading your assessment results..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="container mx-auto px-4 py-8">
          <ErrorMessage 
            message="Failed to load assessment results" 
            onRetry={() => window.location.reload()} 
          />
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">No Assessment Results</h1>
            <p className="text-muted-foreground mb-4">
              You haven't completed any assessments yet.
            </p>
            <Button onClick={() => (window.location.href = "/assessment?type=interest")}>
              Start Interest Assessment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Your Assessment Results</h1>
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              variant="outline"
            >
              {isGeneratingReport ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Generating...
                </>
              ) : (
                "Generate Report"
              )}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="interest" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="interest">Interest</TabsTrigger>
            <TabsTrigger value="ability">Ability</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="careers">Careers</TabsTrigger>
          </TabsList>

          <TabsContent value="interest" className="space-y-4">
            <InterestResults results={assessment.interest.results} />
            <InterestTab results={assessment.interest.results} />
          </TabsContent>

          <TabsContent value="ability" className="space-y-4">
            <AbilityResults results={assessment.ability.results} />
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4">
            <KnowledgeResults results={assessment.knowledge.results} />
          </TabsContent>

          <TabsContent value="skills" className="space-y-4">
            <SkillResults results={assessment.skills.results} />
          </TabsContent>

          <TabsContent value="careers" className="space-y-4">
            {analysisError && (
              <ErrorMessage 
                message={analysisError} 
                onRetry={handleAnalyzeCareers}
              />
            )}
            <CareerRecommendations
              recommendations={assessment.careerRecommendations}
              onAnalyze={handleAnalyzeCareers}
              isLoading={isAnalyzing}
            />
          </TabsContent>
        </Tabs>

        {/* Report Modal */}
        <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Your Career Report</DialogTitle>
              <DialogDescription>
                Comprehensive analysis of your assessment results
              </DialogDescription>
            </DialogHeader>
            {report && (
              <div className="mt-4">
                <pre className="whitespace-pre-wrap text-sm">
                  {JSON.stringify(report, null, 2)}
                </pre>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}