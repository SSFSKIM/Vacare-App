import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { KnowledgeSubsetResult } from "ui/src/types";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  results: KnowledgeSubsetResult[];
}

export function KnowledgeResults({ results }: Props) {
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

  const groupedResults = results.reduce((acc, result) => {
    const key = result.subset || "General";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(result);
    return acc;
  }, {} as Record<string, KnowledgeSubsetResult[]>);

  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {Object.entries(groupedResults).map(([subset, subsetResults]) => {
        const averageScore =
          subsetResults.length > 0
            ? Math.round(
                subsetResults.reduce((sum, r) => sum + r.score, 0) /
                  subsetResults.length
              )
            : 0;

        return (
          <Card key={subset}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg capitalize">
                  {subset} Knowledge
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/knowledgeselection")}
                >
                  Retake Test
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {subsetResults.map((result) => (
                <div key={result.name}>
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-sm font-medium">{result.name}</h4>
                    <span className="text-sm font-semibold">
                      {result.score}%
                    </span>
                  </div>
                  <Progress value={result.score} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
