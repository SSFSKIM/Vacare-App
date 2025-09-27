import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const DEFAULT_VISIBLE_RESULTS = 10;

interface SkillResult {
  subset: string;
  name: string;
  category: string;
  score: number;
  description: string;
}

interface SkillResultsProps {
  results: SkillResult[];
}

interface SkillSubsetResult extends SkillResult {}

interface SubsetPanelProps {
  subsetKey: string;
  displayName: string;
  results: SkillSubsetResult[];
}

const subsetDisplayNames: Record<string, string> = {
  content: 'Content Skills',
  process: 'Process Skills',
  'complex problem solving': 'Complex Problem Solving Skills',
  'resource management': 'Resource Management Skills',
  social: 'Social Skills',
  systems: 'Systems Skills',
  technical: 'Technical Skills'
};

const ORDERED_SUBSET_KEYS = [
  'content',
  'process',
  'complex problem solving',
  'resource management',
  'social',
  'systems',
  'technical'
];

const SkillSubsetPanel = React.memo(({ subsetKey, displayName, results }: SubsetPanelProps) => {
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
          <span className="text-base font-semibold">{displayName}</span>
          <span className="text-xs text-muted-foreground">
            {results.length} skills • Average {averageScore}%
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 px-4 pb-4">
          {visibleResults.map((result, index) => (
            <div key={`${result.name}-${index}`} className="space-y-1">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{result.name}</span>
                <span>{result.score}%</span>
              </div>
              <Progress value={result.score} className="h-1.5" />
              {result.description && (
                <p className="text-xs text-muted-foreground">
                  {result.description}
                </p>
              )}
            </div>
          ))}
        </div>
        {hasMore && (
          <div className="px-4 pb-4">
            <Button onClick={handleLoadMore} variant="ghost" size="sm">
              Show more skills
            </Button>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
});

SkillSubsetPanel.displayName = 'SkillSubsetPanel';

function SkillResultsComponent({ results = [] }: SkillResultsProps) {
  if (!results || results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">No Skill Results</CardTitle>
            <span className="text-sm font-medium text-muted-foreground">Avg: 0%</span>
          </div>
          <Progress value={0} className="h-2 mt-2" />
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            Complete a skills assessment to unlock your personalized insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  const groupedResults = useMemo(() => {
    return results.reduce((acc: Record<string, SkillSubsetResult[]>, result) => {
      const subset = (result.subset || 'other').toLowerCase();
      if (!acc[subset]) {
        acc[subset] = [];
      }
      acc[subset].push(result);
      return acc;
    }, {} as Record<string, SkillSubsetResult[]>);
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

  const fallbackKeys = useMemo(
    () => Object.keys(groupedResults).filter((key) => !ORDERED_SUBSET_KEYS.includes(key)),
    [groupedResults]
  );

  const subsetOrder = useMemo(
    () => [...ORDERED_SUBSET_KEYS, ...fallbackKeys],
    [fallbackKeys]
  );

  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-lg">Skills Overview</CardTitle>
              <p className="text-sm text-muted-foreground">
                Average score of <span className="font-medium text-foreground">{overallAverage}%</span>{' '}
                across {results.length} assessed skills.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/skillselection')}
            >
              Retake Assessment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Top skill strengths
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
                  Complete more assessments to see highlighted skills.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="space-y-4">
        {subsetOrder.map((key) => {
          const subsetResults = groupedResults[key];
          if (!subsetResults || subsetResults.length === 0) {
            return null;
          }

          const displayName = subsetDisplayNames[key] || key.replace(/\b\w/g, (char) => char.toUpperCase());

          return (
            <SkillSubsetPanel
              key={key}
              subsetKey={key}
              displayName={displayName}
              results={subsetResults}
            />
          );
        })}
      </Accordion>
    </div>
  );
}

export const SkillResults = React.memo(SkillResultsComponent);
SkillResults.displayName = 'SkillResults';
