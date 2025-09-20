import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

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

interface SkillSubsetResult {
  subset: string;
  name: string;
  category: string;
  score: number;
  description: string;
}

const SkillResultCard: React.FC<{ title: string; results: SkillResult[]; }> = ({ title, results }) => {
  const averageScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{title}</CardTitle>
          <span className="text-sm font-medium text-muted-foreground">Avg: {averageScore}%</span>
        </div>
        <Progress value={averageScore} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {results.map((result, index) => (
          <div key={`${result.name}-${index}`}>
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-sm font-medium">{result.name}</h4>
              <span className="text-sm font-semibold">{result.score}%</span>
            </div>
            <Progress value={result.score} className="h-1.5" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export const SkillResults: React.FC<SkillResultsProps> = ({ results = [] }) => {
  const groupedResults = results.reduce((acc: { [key: string]: SkillSubsetResult[] }, result) => {
    const subset = result.subset || 'other';
    if (!acc[subset]) {
      acc[subset] = [];
    }
    acc[subset].push(result);
    return acc;
  }, {} as Record<string, SkillSubsetResult[]>);

  const subsets = [
    { key: 'content', title: 'Content Skills' },
    { key: 'process', title: 'Process Skills' },
    { key: 'complex problem solving', title: 'Complex Problem Solving Skills' },
    { key: 'resource management', title: 'Resource Management Skills' },
    { key: 'social', title: 'Social Skills' },
    { key: 'systems', title: 'Systems Skills' },
    { key: 'technical', title: 'Technical Skills' }
  ];

  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subsets.map(({ key, title }) => {
          const subsetResults = groupedResults[key] || [];
          if (subsetResults.length === 0) return null;

          const averageScore = subsetResults.length > 0
            ? Math.round(subsetResults.reduce((sum, r) => sum + r.score, 0) / subsetResults.length)
            : 0;

          return (
            <Card key={key}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg capitalize">{title}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/skillselection")}
                  >
                    Retake Test
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {subsetResults.map((result, index) => (
                  <div key={`${result.name}-${index}`}>
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-sm font-medium">{result.name}</h4>
                      <span className="text-sm font-semibold">{result.score}%</span>
                    </div>
                    <Progress value={result.score} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
