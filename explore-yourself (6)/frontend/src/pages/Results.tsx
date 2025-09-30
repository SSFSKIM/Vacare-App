import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NavigationBar } from "../components/NavigationBar";
import { useFirebaseAssessmentStore } from "../utils/firebase-assessment-store";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AbilityResults } from "components/AbilityResults";
import { KnowledgeResults } from 'components/KnowledgeResults';
import { SkillResults } from 'components/SkillResults';
import { InterestTab } from 'components/InterestTab';
import { CareerRecommendations } from "components/CareerRecommendations";
import { ClusterProfileTab } from 'components/ClusterProfileTab';
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
import { useTranslation } from "react-i18next";

export default function Results() {
  const { t } = useTranslation();
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
    const sanitizeResults = <T extends { name?: string | null; score: number }>(
      items: T[],
      label: string
    ) =>
      items.reduce<Array<{ name: string; rating: number }>>((acc, item) => {
        const hasName = typeof item.name === 'string' && item.name.trim().length > 0;
        const hasScore = typeof item.score === 'number' && Number.isFinite(item.score);

        if (!hasName || !hasScore) {
          console.warn(`Skipping ${label} result missing name or score`, item);
          return acc;
        }

        acc.push({ name: item.name!.trim(), rating: item.score });
        return acc;
      }, []);

    const interestsPayload = interest.results.reduce<Array<{ name: string; rating: number }>>(
      (acc, item) => {
        const hasCategory = typeof item.category === 'string' && item.category.trim().length > 0;
        const hasScore = typeof item.score === 'number' && Number.isFinite(item.score);

        if (!hasCategory || !hasScore) {
          console.warn('Skipping interest result missing category or score', item);
          return acc;
        }

        acc.push({ name: item.category.trim(), rating: item.score });
        return acc;
      },
      []
    );

    const response = await brain.analyze_multi_category({
      interests: interestsPayload,
      abilities: sanitizeResults(ability.results, 'ability'),
      knowledge: sanitizeResults(knowledge.results, 'knowledge'),
      skills: sanitizeResults(skills.results, 'skill'),
    });
    const data = await response.json();
    setCareerRecommendations(data);

  } catch (err) {
    console.error("Failed to analyze career matches:", err);
    const fallbackMessage = t('results.toast.analyzeError');
    const errorMessage = err instanceof Error && err.message ? err.message : fallbackMessage;
    setAnalysisError(errorMessage);
    toast.error(errorMessage);
  } finally {
    setIsAnalyzing(false);
  }
  }, [assessment, setCareerRecommendations, t]);

  const interestTabData = useMemo(() => {
    const rawResults = assessment?.interest?.results ?? [];
    if (!rawResults || rawResults.length === 0) {
      return [];
    }

    const codeMap: Record<string, 'R' | 'I' | 'A' | 'S' | 'E' | 'C'> = {
      realistic: 'R',
      investigative: 'I',
      artistic: 'A',
      social: 'S',
      enterprising: 'E',
      conventional: 'C',
    };

    return rawResults
      .map((result) => {
        const key = typeof result.category === 'string' ? result.category.toLowerCase() : '';
        const code = codeMap[key];
        if (!code) {
          return null;
        }

        const scoreValue = typeof result.score === 'number' ? result.score : 0;
        const normalizedScore = Number.isFinite(scoreValue) ? scoreValue / 20 : 0;

        return {
          name: code,
          score: normalizedScore,
        };
      })
      .filter((item): item is { name: 'R' | 'I' | 'A' | 'S' | 'E' | 'C'; score: number } => item !== null);
  }, [assessment?.interest?.results]);

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
      const fallbackMessage = t('results.toast.historyError');
      const message = err instanceof Error && err.message ? err.message : fallbackMessage;
      toast.error(message);
    } finally {
      setIsHistoryLoading(false);
      setIsReportLoading(false);
    }
  }, [selectedReport, t, user]);

  const handleSelectReport = useCallback(async (reportId: string) => {
    if (!user) return;
    setIsReportLoading(true);
    try {
      const report = await getCareerReport(reportId);
      setSelectedReport(report);
    } catch (err) {
      console.error('Failed to load report:', err);
      const fallbackMessage = t('results.toast.reportError');
      const message = err instanceof Error && err.message ? err.message : fallbackMessage;
      toast.error(message);
    } finally {
      setIsReportLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    if (user) {
      loadReportHistory(false).catch((err) => {
        console.error('History preload failed:', err);
      });
    }
  }, [user, loadReportHistory]);

  const handleGenerateReport = async () => {
    if (!user) {
      toast.error(t('results.toast.loginRequired'));
      return;
    }

    setIsGeneratingReport(true);
    toast.info(t('results.toast.generatingStart'));

    try {
      const generatedReport = await generateCareerReport(user.uid);
      upsertReportSummary(generatedReport);
      setSelectedReport(generatedReport);
      setIsReportModalOpen(true);
      toast.success(t('results.toast.generateSuccess'));
    } catch (error) {
      console.error("Failed to generate report:", error);
      const fallbackMessage = t('results.toast.generateError');
      const errorMessage = error instanceof Error && error.message ? error.message : fallbackMessage;
      toast.error(errorMessage);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleRegenerateReport = useCallback(async () => {
    if (!selectedReport) {
      toast.error(t('results.toast.selectReport'));
      return;
    }

    setIsRegeneratingReport(true);
    toast.info(t('results.toast.regeneratingStart'));

    try {
      const updatedReport = await regenerateCareerReport(selectedReport.reportId);
      upsertReportSummary(updatedReport);
      setSelectedReport(updatedReport);
      toast.success(t('results.toast.regenerateSuccess'));
    } catch (err) {
      console.error('Failed to regenerate report:', err);
      const fallbackMessage = t('results.toast.regenerateError');
      const message = err instanceof Error && err.message ? err.message : fallbackMessage;
      toast.error(message);
    } finally {
      setIsRegeneratingReport(false);
    }
  }, [selectedReport, t, upsertReportSummary]);

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
      toast.success(t('results.toast.exportSuccess', { format: extension.toUpperCase() }));
    } catch (err) {
      console.error('Failed to export report:', err);
      const fallbackMessage = t('results.toast.exportError');
      const message = err instanceof Error && err.message ? err.message : fallbackMessage;
      toast.error(message);
    } finally {
      setExportingFormat(null);
    }
  }, [selectedReport, t]);

  const handleOpenReportModal = useCallback(() => {
    if (!user) {
      toast.error(t('results.toast.viewLoginRequired'));
      return;
    }

    if (reportHistory.length === 0) {
      loadReportHistory(true).catch((err) => {
        console.error('Unable to load reports:', err);
      });
    }

    setIsReportModalOpen(true);
  }, [loadReportHistory, reportHistory.length, t, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message={t('results.loadingMessage')} />
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
            message={t('results.error.load')} 
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
            <h1 className="text-2xl font-bold mb-4">{t('results.empty.title')}</h1>
            <p className="text-muted-foreground mb-4">
              {t('results.empty.description')}
            </p>
            <Button onClick={() => (window.location.href = "/assessment?type=interest")}>
              {t('results.buttons.startInterest')}
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
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
          <h1 className="text-3xl font-bold">{t('results.heading')}</h1>
          <div className="flex gap-2 sm:justify-end">
            <Button
              variant="secondary"
              onClick={handleOpenReportModal}
            >
              {t('results.buttons.viewReports')}
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              variant="outline"
            >
              {isGeneratingReport ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  {t('results.buttons.generating')}
                </>
              ) : (
                t('results.buttons.generateReport')
              )}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="interest" className="w-full">
          <TabsList className="w-full overflow-x-auto flex gap-2 sm:grid sm:grid-cols-6">
            <TabsTrigger value="interest">{t('results.tabs.interest')}</TabsTrigger>
            <TabsTrigger value="ability">{t('results.tabs.ability')}</TabsTrigger>
            <TabsTrigger value="knowledge">{t('results.tabs.knowledge')}</TabsTrigger>
            <TabsTrigger value="skills">{t('results.tabs.skills')}</TabsTrigger>
            <TabsTrigger value="cluster-profile">{t('results.tabs.clusterProfile')}</TabsTrigger>
            <TabsTrigger value="careers">{t('results.tabs.careers')}</TabsTrigger>
          </TabsList>

          <TabsContent value="interest" className="space-y-4">
            <InterestTab data={interestTabData} />
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

          <TabsContent value="cluster-profile" className="space-y-4">
            <ClusterProfileTab
              recommendations={assessment.careerRecommendations}
              onAnalyze={handleAnalyzeCareers}
              isLoading={isAnalyzing}
            />
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
              <DialogTitle>{t('results.dialog.title')}</DialogTitle>
              <DialogDescription>
                {t('results.dialog.description')}
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
                    <LoadingSpinner message={t('results.dialog.loadingDetails')} />
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
                    {t('results.dialog.emptyState')}
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
  const { t } = useTranslation();
  return (
    <aside className="flex flex-col gap-4 rounded-md border border-border bg-muted/20 p-4">
      <div>
        <h2 className="text-sm font-semibold">{t('results.reportHistory.title')}</h2>
        <p className="text-xs text-muted-foreground">
          {t('results.reportHistory.description')}
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner message={t('results.reportHistory.loading')} className="mx-auto" />
      ) : reports.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('results.reportHistory.empty')}</p>
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
                      : t('results.reportHistory.noAssessments')}
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
  const { t } = useTranslation();
  const sections = report.sections;

  return (
    <div className="space-y-6 text-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold">{t('results.report.overviewTitle')}</h2>
          <p className="text-xs text-muted-foreground">
            {t('results.report.generatedAt', { date: new Date(report.generatedAt).toLocaleString() })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => onExport('pdf')}
            disabled={exportingFormat !== null}
          >
            {exportingFormat === 'pdf' ? t('results.report.actions.exporting') : t('results.report.actions.exportPdf')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => onExport('text')}
            disabled={exportingFormat !== null}
          >
            {exportingFormat === 'text' ? t('results.report.actions.exporting') : t('results.report.actions.exportText')}
          </Button>
          <Button onClick={onRegenerate} disabled={isRegenerating}>
            {isRegenerating ? t('results.report.actions.regenerating') : t('results.report.actions.regenerate')}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-3 sm:grid-cols-2">
        <InfoRow label={t('results.info.reportId')} value={report.reportId} />
        <InfoRow label={t('results.info.dataQuality')} value={report.dataQuality} />
        <InfoRow label={t('results.info.assessments')} value={report.completedAssessments.join(', ') || '—'} />
        <InfoRow label={t('results.info.model')} value={report.model} />
        <InfoRow label={t('results.info.promptVersion')} value={report.promptVersion} />
      </div>

      <section>
        <h2 className="text-base font-semibold">{t('results.sections.executiveSummary')}</h2>
        <div className="mt-2 rounded-md border border-border bg-muted/30 p-4 leading-relaxed">
          {sections.executiveSummary}
        </div>
      </section>

      {sections.strengthsAnalysis.length > 0 && (
        <section>
          <h2 className="text-base font-semibold">{t('results.sections.strengthsAnalysis')}</h2>
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
          <h2 className="text-base font-semibold">{t('results.sections.careerPathRecommendations')}</h2>
          <div className="mt-2 space-y-3">
            {sections.careerPathRecommendations.map((rec) => (
              <div key={rec.title} className="rounded-md border border-border bg-background p-3">
                <p className="font-semibold">
                  {rec.title}
                  {rec.matchScore !== undefined && rec.matchScore !== null ? ` • ${t('results.sections.careerPath.matchScore', { score: rec.matchScore })}` : ''}
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
          <h2 className="text-base font-semibold">{t('results.sections.interestGuide')}</h2>
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
        <h2 className="text-base font-semibold">{t('results.sections.nextSteps')}</h2>
        <div className="mt-2 grid gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-3">
          <NextStepColumn title={t('results.nextSteps.immediate')} items={sections.nextSteps.immediate} />
          <NextStepColumn title={t('results.nextSteps.shortTerm')} items={sections.nextSteps.shortTerm} />
          <NextStepColumn title={t('results.nextSteps.longTerm')} items={sections.nextSteps.longTerm} />
        </div>
      </section>

      {sections.additionalResources.length > 0 && (
        <section>
          <h2 className="text-base font-semibold">{t('results.sections.additionalResources')}</h2>
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
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('results.nextSteps.empty')}</p>
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
