import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CareerRecommendations as CareerRecommendationsData } from '@/types'
import { LoadingSpinner } from "./LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Briefcase, TrendingUp, Award, Target } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  recommendations: CareerRecommendationsData | null;
  onAnalyze: () => Promise<void>;
  isLoading: boolean;
}

const ITEMS_PER_BATCH = 5;

function CareerRecommendationsComponent({ recommendations, onAnalyze, isLoading }: Props) {
  const { t } = useTranslation();
  const defaultAnalysisError = t('careerRecommendations.error.generic');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const observerRef = useRef<HTMLDivElement | null>(null);

  const handleAnalysis = useCallback(async () => {
    if (hasAnalyzed) return;

    setAnalysisError(null);
    setHasAnalyzed(true);

    try {
      await onAnalyze();
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisError(error instanceof Error && error.message ? error.message : defaultAnalysisError);
      setHasAnalyzed(false);
    }
  }, [defaultAnalysisError, hasAnalyzed, onAnalyze]);

  const handleRetry = useCallback(() => {
    setHasAnalyzed(false);
    setAnalysisError(null);
    // Defer to next microtask so state updates apply before re-trigger
    Promise.resolve().then(() => handleAnalysis());
  }, [handleAnalysis]);

  // Sort matches by correlation score (highest first)
  const matches = recommendations?.matches ?? [];

  const sortedMatches = useMemo(
    () =>
      [...matches].sort((a, b) => (b.correlation || 0) - (a.correlation || 0)),
    [matches]
  );

  const handleLoadMore = useCallback(() => {
    setVisibleCount((current) => {
      const nextCount = current + ITEMS_PER_BATCH;
      return Math.min(nextCount, sortedMatches.length);
    });
  }, [sortedMatches.length]);

  const hasMoreMatches = visibleCount < sortedMatches.length;

  const visibleMatches = useMemo(
    () => sortedMatches.slice(0, visibleCount),
    [sortedMatches, visibleCount]
  );

  useEffect(() => {
    if (!recommendations && !isLoading && !hasAnalyzed) {
      handleAnalysis();
    }
  }, [recommendations, isLoading, hasAnalyzed, handleAnalysis]);

  useEffect(() => {
    if (!recommendations?.matches) {
      setVisibleCount(0);
      return;
    }

    setVisibleCount(Math.min(ITEMS_PER_BATCH, recommendations.matches.length));
  }, [recommendations?.matches]);

  useEffect(() => {
    if (!hasMoreMatches) {
      return;
    }

    const sentinel = observerRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            obs.unobserve(entry.target);
            handleLoadMore();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreMatches, handleLoadMore]);

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">{t('careerRecommendations.title')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-40 space-y-4">
          <LoadingSpinner message={t('careerRecommendations.loading.message')} />
          <p className="text-sm text-muted-foreground text-center">
            {t('careerRecommendations.loading.description')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (analysisError) {
    return (
      <Card className="border-2 border-destructive/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-destructive" />
            <CardTitle className="text-xl">{t('careerRecommendations.title')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-destructive mb-4">
              {analysisError ?? defaultAnalysisError}
            </p>
            <Button onClick={handleRetry} variant="outline">
              {t('careerRecommendations.actions.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations || sortedMatches.length === 0) {
    return (
      <Card className="border-2 border-muted">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
            <CardTitle className="text-xl">{t('careerRecommendations.title')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {t('careerRecommendations.empty.description')}
            </p>
            <Button onClick={handleRetry} variant="outline">
              {t('careerRecommendations.actions.analyzeAgain')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCorrelationColor = (correlation: number) => {
    if (correlation >= 0.8) return "bg-green-100 text-green-800 border-green-200";
    if (correlation >= 0.6) return "bg-blue-100 text-blue-800 border-blue-200";
    if (correlation >= 0.4) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getCorrelationLabel = (correlation: number) => {
    if (correlation >= 0.8) return t('careerRecommendations.status.excellent');
    if (correlation >= 0.6) return t('careerRecommendations.status.good');
    if (correlation >= 0.4) return t('careerRecommendations.status.fair');
    return t('careerRecommendations.status.potential');
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">{t('careerRecommendations.title')}</CardTitle>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Award className="h-3 w-3" />
            {t('careerRecommendations.badge', { count: sortedMatches.length })}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('careerRecommendations.summary')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleMatches.map((match, index) => (
          <Card key={`${match.title}-${index}`} className="border border-muted">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{match.title}</h3>
                  {match.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {match.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <Badge 
                    className={`${getCorrelationColor(match.correlation || 0)} border`}
                    variant="outline"
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {Math.round((match.correlation || 0) * 100)}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {getCorrelationLabel(match.correlation || 0)}
                  </span>
                </div>
              </div>
              
              {/* Additional match details could go here */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('careerRecommendations.matchLabel', { index: index + 1 })}</span>
                <span>{t('careerRecommendations.correlationLabel', { value: ((match.correlation || 0) * 100).toFixed(1) })}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {hasMoreMatches && (
          <div className="flex justify-center">
            <Button onClick={handleLoadMore} variant="ghost" size="sm">
              {t('careerRecommendations.actions.loadMore')}
            </Button>
          </div>
        )}

        <div ref={observerRef} className="h-1" aria-hidden="true" />
        
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t('careerRecommendations.analysisBase', { category: t(`careerRecommendations.analysisCategory.${recommendations?.category ?? 'comprehensive'}`, { defaultValue: recommendations?.category ?? t('careerRecommendations.analysisCategory.comprehensive') }) })}
            </p>
            <Button onClick={handleRetry} variant="outline" size="sm">
              {t('careerRecommendations.actions.refresh')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const CareerRecommendations = React.memo(CareerRecommendationsComponent);
CareerRecommendations.displayName = 'CareerRecommendations';
