import React, { useCallback, useEffect, useState } from "react";
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
  exportReport as exportCareerReport,
  generateReport as generateCareerReport,
  getReport as getCareerReport,
  listReports as listCareerReports,
  regenerateReport as regenerateCareerReport,
  type ComprehensiveReport,
  type ReportSummary,
} from "@/utils/report-service";
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
  const [reportHistory, setReportHistory] = useState<ReportSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<ComprehensiveReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [isRegeneratingReport, setIsRegeneratingReport] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'text' | null>(null);

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

  const summaryFromReport = (report: ComprehensiveReport): ReportSummary => ({
    reportId: report.reportId,
    generatedAt: report.generatedAt,
    dataQuality: report.dataQuality,
    completedAssessments: report.completedAssessments ?? [],
    model: report.model,
    promptVersion: report.promptVersion,
  });

  const upsertReportSummary = useCallback((report: ComprehensiveReport) => {
    setReportHistory((prev) => {
      const summary = summaryFromReport(report);
      const filtered = prev.filter((item) => item.reportId !== summary.reportId);
      return [summary, ...filtered];
    });
  }, []);

  const loadReportHistory = useCallback(async (selectLatest: boolean = false) => {
    if (!user) return;
    setIsHistoryLoading(true);
    try {
      const history = await listCareerReports();
      setReportHistory(history);

      if ((selectLatest || !selectedReport) && history.length > 0) {
        setIsReportLoading(true);
        const latest = await getCareerReport(history[0].reportId);
        setSelectedReport(latest);
      } else if (history.length === 0) {
        setSelectedReport(null);
      }
    } catch (err) {
      console.error('Failed to load report history:', err);
      const message = err instanceof Error ? err.message : 'Failed to load report history';
      toast.error(message);
    } finally {
      setIsHistoryLoading(false);
      setIsReportLoading(false);
    }
  }, [selectedReport, user]);

  const handleSelectReport = useCallback(async (reportId: string) => {
    if (!user) return;
    setIsReportLoading(true);
    try {
      const report = await getCareerReport(reportId);
      setSelectedReport(report);
    } catch (err) {
      console.error('Failed to load report:', err);
      const message = err instanceof Error ? err.message : 'Failed to load report';
      toast.error(message);
    } finally {
      setIsReportLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadReportHistory(false).catch((err) => {
        console.error('History preload failed:', err);
      });
    }
  }, [user, loadReportHistory]);

  const handleGenerateReport = async () => {
    if (!user) {
      toast.error("You must be logged in to generate a report.");
      return;
    }

    setIsGeneratingReport(true);
    toast.info("Generating your career report... This may take a moment.");

    try {
      const generatedReport = await generateCareerReport(user.uid);
      upsertReportSummary(generatedReport);
      setSelectedReport(generatedReport);
      setIsReportModalOpen(true);
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Failed to generate report:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate report. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleRegenerateReport = useCallback(async () => {
    if (!selectedReport) {
      toast.error('Select a report to regenerate.');
      return;
    }

    setIsRegeneratingReport(true);
    toast.info('Regenerating your career report...');

    try {
      const updatedReport = await regenerateCareerReport(selectedReport.reportId);
      upsertReportSummary(updatedReport);
      setSelectedReport(updatedReport);
      toast.success('Report regenerated successfully.');
    } catch (err) {
      console.error('Failed to regenerate report:', err);
      const message = err instanceof Error ? err.message : 'Failed to regenerate report';
      toast.error(message);
    } finally {
      setIsRegeneratingReport(false);
    }
  }, [selectedReport, upsertReportSummary]);

  const handleExportReport = useCallback(async (format: 'pdf' | 'text') => {
    if (!selectedReport) return;

    setExportingFormat(format);
    try {
      const blob = await exportCareerReport(selectedReport.reportId, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const extension = format === 'pdf' ? 'pdf' : 'txt';
      link.download = `career-report-${selectedReport.reportId}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Report exported as ${extension.toUpperCase()}.`);
    } catch (err) {
      console.error('Failed to export report:', err);
      const message = err instanceof Error ? err.message : 'Failed to export report';
      toast.error(message);
    } finally {
      setExportingFormat(null);
    }
  }, [selectedReport]);

  const handleOpenReportModal = useCallback(() => {
    if (!user) {
      toast.error('You must be logged in to view reports.');
      return;
    }

    if (reportHistory.length === 0) {
      loadReportHistory(true).catch((err) => {
        console.error('Unable to load reports:', err);
      });
    }

    setIsReportModalOpen(true);
  }, [loadReportHistory, reportHistory.length, user]);

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
              variant="secondary"
              onClick={handleOpenReportModal}
            >
              View Reports
            </Button>
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
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Your Career Report</DialogTitle>
              <DialogDescription>
                View AI-generated insights and recommendations based on your assessment results
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-4 md:grid-cols-[260px_1fr]">
              <ReportHistoryList
                reports={reportHistory}
                selectedReportId={selectedReport?.reportId ?? null}
                onSelect={handleSelectReport}
                isLoading={isHistoryLoading}
              />
              <div className="space-y-4">
                {isReportLoading && (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner message="Loading report details..." />
                  </div>
                )}

                {!isReportLoading && selectedReport && (
                  <DetailedReportView
                    report={selectedReport}
                    onExport={handleExportReport}
                    onRegenerate={handleRegenerateReport}
                    exportingFormat={exportingFormat}
                    isRegenerating={isRegeneratingReport}
                  />
                )}

                {!isReportLoading && !selectedReport && !isHistoryLoading && (
                  <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Generate a report to see AI-driven insights here.
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ReportHistoryList({
  reports,
  selectedReportId,
  onSelect,
  isLoading,
}: {
  reports: ReportSummary[]
  selectedReportId: string | null
  onSelect: (reportId: string) => void
  isLoading: boolean
}) {
  return (
    <aside className="flex flex-col gap-4 rounded-md border border-border bg-muted/20 p-4">
      <div>
        <h2 className="text-sm font-semibold">Report History</h2>
        <p className="text-xs text-muted-foreground">
          Select a report to revisit previous insights.
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading history..." className="mx-auto" />
      ) : reports.length === 0 ? (
        <p className="text-xs text-muted-foreground">No reports generated yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {reports.map((item) => {
            const generatedAt = new Date(item.generatedAt).toLocaleString();
            const isActive = item.reportId === selectedReportId;

            return (
              <li key={item.reportId}>
                <button
                  type="button"
                  onClick={() => onSelect(item.reportId)}
                  className={`w-full rounded-md border p-3 text-left transition ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:border-primary/60'
                  }`}
                >
                  <p className="text-sm font-medium">{generatedAt}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.completedAssessments.length > 0
                      ? item.completedAssessments.join(', ')
                      : 'No assessments'}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

function DetailedReportView({
  report,
  onExport,
  onRegenerate,
  exportingFormat,
  isRegenerating,
}: {
  report: ComprehensiveReport
  onExport: (format: 'pdf' | 'text') => void
  onRegenerate: () => void
  exportingFormat: 'pdf' | 'text' | null
  isRegenerating: boolean
}) {
  const sections = report.sections;

  return (
    <div className="space-y-6 text-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Report Overview</h2>
          <p className="text-xs text-muted-foreground">
            Generated on {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => onExport('pdf')}
            disabled={exportingFormat !== null}
          >
            {exportingFormat === 'pdf' ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => onExport('text')}
            disabled={exportingFormat !== null}
          >
            {exportingFormat === 'text' ? 'Exporting...' : 'Export Text'}
          </Button>
          <Button onClick={onRegenerate} disabled={isRegenerating}>
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-3 sm:grid-cols-2">
        <InfoRow label="Report ID" value={report.reportId} />
        <InfoRow label="Data Quality" value={report.dataQuality} />
        <InfoRow label="Assessments" value={report.completedAssessments.join(', ') || '—'} />
        <InfoRow label="Model" value={report.model} />
        <InfoRow label="Prompt Version" value={report.promptVersion} />
      </div>

      <section>
        <h2 className="text-base font-semibold">Executive Summary</h2>
        <div className="mt-2 rounded-md border border-border bg-muted/30 p-4 leading-relaxed">
          {sections.executiveSummary}
        </div>
      </section>

      {sections.strengthsAnalysis.length > 0 && (
        <section>
          <h2 className="text-base font-semibold">Strengths Analysis</h2>
          <ul className="mt-2 space-y-3">
            {sections.strengthsAnalysis.map((item) => (
              <li key={`${item.title}-${item.category ?? 'general'}`} className="rounded-md border border-border bg-background p-3">
                <p className="font-medium">
                  {item.category ? `${item.category} • ` : ''}
                  {item.title}
                  {item.score !== undefined && item.score !== null ? ` (${item.score})` : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{item.insight}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sections.careerPathRecommendations.length > 0 && (
        <section>
          <h2 className="text-base font-semibold">Career Path Recommendations</h2>
          <div className="mt-2 space-y-3">
            {sections.careerPathRecommendations.map((rec) => (
              <div key={rec.title} className="rounded-md border border-border bg-background p-3">
                <p className="font-semibold">
                  {rec.title}
                  {rec.matchScore !== undefined && rec.matchScore !== null ? ` • ${rec.matchScore}% match` : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{rec.rationale}</p>
                {rec.developmentActions.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                    {rec.developmentActions.map((action, index) => (
                      <li key={`${rec.title}-action-${index}`}>{action}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {sections.interestExplorationGuide.length > 0 && (
        <section>
          <h2 className="text-base font-semibold">Interest Exploration Guide</h2>
          <div className="mt-2 space-y-3">
            {sections.interestExplorationGuide.map((guide) => (
              <div key={guide.area} className="rounded-md border border-border bg-background p-3">
                <p className="font-semibold">{guide.area}</p>
                <p className="text-xs text-muted-foreground mt-1">{guide.insight}</p>
                {guide.suggestedActivities.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                    {guide.suggestedActivities.map((activity, index) => (
                      <li key={`${guide.area}-activity-${index}`}>{activity}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold">Next Steps</h2>
        <div className="mt-2 grid gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-3">
          <NextStepColumn title="Immediate" items={sections.nextSteps.immediate} />
          <NextStepColumn title="Short Term" items={sections.nextSteps.shortTerm} />
          <NextStepColumn title="Long Term" items={sections.nextSteps.longTerm} />
        </div>
      </section>

      {sections.additionalResources.length > 0 && (
        <section>
          <h2 className="text-base font-semibold">Additional Resources</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {sections.additionalResources.map((resource, index) => (
              <li key={`${resource}-${index}`}>{resource}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === null || value === '') return null;

  return (
    <div className="flex flex-col">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function NextStepColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No recommendations provided.</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
