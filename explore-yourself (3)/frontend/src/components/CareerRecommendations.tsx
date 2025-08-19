import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CareerRecommendations as CareerRecs } from "ui/src/types";
import { LoadingSpinner } from "./LoadingSpinner";
import { Button } from "@/components/ui/button";

interface Props {
  recommendations: CareerRecs | null;
  onAnalyze: () => Promise<void>;
  isLoading: boolean;
}

export function CareerRecommendations({ recommendations, onAnalyze, isLoading }: Props) {
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  useEffect(() => {
    // Automatically trigger analysis if no recommendations are present
    if (!recommendations && !isLoading && !hasAnalyzed) {
      onAnalyze();
      setHasAnalyzed(true);
    }
  }, [recommendations, isLoading, hasAnalyzed, onAnalyze]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Career Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <LoadingSpinner message="Analyzing your career matches..." />
        </CardContent>
      </Card>
    );
  }

  if (!recommendations || recommendations.matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Career Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            We couldn't find any career matches based on your results. You can
            try retaking some assessments to get a different outcome.
          </p>
          <Button onClick={onAnalyze} className="mt-4">Re-run Analysis</Button>
        </CardContent>
      </Card>
    );
  }

  const getGradientColor = (correlation: number): string => {
    // Hue ranges from 0 (red) to 120 (green)
    const hue = correlation * 120;
    // Using HSL for easy color manipulation
    return `hsl(${hue}, 80%, 45%)`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Top Career Matches</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.matches.map((match) => {
          const gradientColor = getGradientColor(match.correlation);
          const percentage = (match.correlation * 100).toFixed(0);

          return (
            <Card
              key={match.title}
              className="p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg pr-4">{match.title}</h3>
                <Badge
                  style={{ backgroundColor: gradientColor }}
                  className="text-white"
                >
                  {percentage}% Match
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full"
                  style={{
                    backgroundColor: gradientColor,
                    width: `${percentage}%`,
                  }}
                />
              </div>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
};
