import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { KnowledgeSubsetResult } from 'ui/src/types';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const DEFAULT_VISIBLE_RESULTS = 10;

interface Props {
  results: KnowledgeSubsetResult[];
}

interface SubsetPanelProps {
  subsetKey: string;
  displayName: string;
  results: KnowledgeSubsetResult[];
}

const KnowledgeSubsetPanel = React.memo(({ subsetKey, displayName, results }: SubsetPanelProps) => {
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_RESULTS);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(current + DEFAULT_VISIBLE_RESULTS, results.length));
  }, [results.length]);

  const visibleResults = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount]
  );

  const hasMore = visibleCount < results.length;
  const averageScore = Math.round(
    results.reduce((sum, r) => sum + r.score, 0) /
      Math.max(results.length, 1)
  );

  return (
    <AccordionItem value={subsetKey} className="overflow-hidden rounded-lg border">
      <AccordionTrigger className="px-4 text-left">
        <div className="flex flex-col items-start">
          <span className="text-base font-semibold">{displayName} Knowledge</span>
          <span className="text-xs text-muted-foreground">
            {results.length} topics • Average {averageScore}%
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 px-4 pb-4">
          {visibleResults.map((result) => (
            <div key={result.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{result.name}</span>
                <span>{result.score}%</span>
              </div>
              <Progress value={result.score} className="h-1.5" />
            </div>
          ))}
        </div>
        {hasMore && (
          <div className="px-4 pb-4">
            <Button onClick={handleLoadMore} variant="ghost" size="sm">
              Show more topics
            </Button>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
});

KnowledgeSubsetPanel.displayName = 'KnowledgeSubsetPanel';

function KnowledgeResultsComponent({ results }: Props) {
  if (!results || results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">No Results</CardTitle>
            <span className="text-sm font-medium text-muted-foreground">Avg: 0%</span>
          </div>
          <Progress value={0} className="h-2 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-sm font-medium">No Results</h4>
              <span className="text-sm font-semibold">0%</span>
            </div>
            <Progress value={0} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedResults = useMemo(() => {
    return results.reduce((acc, result) => {
      const key = result.subset || 'general';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    }, {} as Record<string, KnowledgeSubsetResult[]>);
  }, [results]);

  const sortedResults = useMemo(
    () => [...results].sort((a, b) => b.score - a.score),
    [results]
  );

  const topResults = sortedResults.slice(0, 3);
  const overallAverage = Math.round(
    sortedResults.reduce((sum, item) => sum + item.score, 0) /
      Math.max(sortedResults.length, 1)
  );

  const formatSubsetName = useCallback(
    (subset: string) =>
      (subset || 'General')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    []
  );

  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-lg">Knowledge Overview</CardTitle>
              <p className="text-sm text-muted-foreground">
                Average score of <span className="font-medium text-foreground">{overallAverage}%</span>{' '}
                across {results.length} knowledge areas.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/knowledgeselection')}
            >
              Retake Assessment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Top knowledge strengths
            </h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {topResults.map((result) => (
                <div key={result.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{result.name}</span>
                    <span>{result.score}%</span>
                  </div>
                  <Progress value={result.score} className="h-1.5" />
                </div>
              ))}
              {topResults.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Complete more assessments to see highlighted knowledge areas.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="space-y-4">
        {Object.entries(groupedResults).map(([subset, subsetResults]) => {
          if (!subsetResults || subsetResults.length === 0) {
            return null;
          }

          const displayName = formatSubsetName(subset);

          return (
            <KnowledgeSubsetPanel
              key={subset}
              subsetKey={subset}
              displayName={displayName}
              results={subsetResults}
            />
          );
        })}
      </Accordion>
    </div>
  );
}

export const KnowledgeResults = React.memo(KnowledgeResultsComponent);
KnowledgeResults.displayName = 'KnowledgeResults';

