import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CareerRecommendations as CareerRecs } from "ui/src/types";
import { LoadingSpinner } from "./LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Briefcase, TrendingUp, Award, Target } from "lucide-react";

interface Props {
  recommendations: CareerRecs | null;
  onAnalyze: () => Promise<void>;
  isLoading: boolean;
}

export function CareerRecommendations({ recommendations, onAnalyze, isLoading }: Props) {
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    // Automatically trigger analysis if no recommendations are present
    if (!recommendations && !isLoading && !hasAnalyzed) {
      handleAnalysis();
    }
  }, [recommendations, isLoading, hasAnalyzed]);

  const handleAnalysis = async () => {
    if (hasAnalyzed) return;
    
    setAnalysisError(null);
    setHasAnalyzed(true);
    
    try {
      await onAnalyze();
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed');
      setHasAnalyzed(false); // Allow retry
    }
  };

  const handleRetry = () => {
    setHasAnalyzed(false);
    setAnalysisError(null);
    handleAnalysis();
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Career Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-40 space-y-4">
          <LoadingSpinner message="Analyzing your career matches..." />
          <p className="text-sm text-muted-foreground text-center">
            We're analyzing your assessment results to find the best career matches for you.
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
            <CardTitle className="text-xl">Career Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-destructive mb-4">
              Failed to analyze career matches: {analysisError}
            </p>
            <Button onClick={handleRetry} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations || !recommendations.matches || recommendations.matches.length === 0) {
    return (
      <Card className="border-2 border-muted">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
            <CardTitle className="text-xl">Career Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              We couldn't find any career matches based on your current results. 
              Complete more assessments to get personalized recommendations.
            </p>
            <Button onClick={handleRetry} variant="outline">
              Analyze Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort matches by correlation score (highest first)
  const sortedMatches = [...recommendations.matches].sort(
    (a, b) => (b.correlation || 0) - (a.correlation || 0)
  );

  const getCorrelationColor = (correlation: number) => {
    if (correlation >= 0.8) return "bg-green-100 text-green-800 border-green-200";
    if (correlation >= 0.6) return "bg-blue-100 text-blue-800 border-blue-200";
    if (correlation >= 0.4) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getCorrelationLabel = (correlation: number) => {
    if (correlation >= 0.8) return "Excellent Match";
    if (correlation >= 0.6) return "Good Match";
    if (correlation >= 0.4) return "Fair Match";
    return "Potential Match";
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Career Recommendations</CardTitle>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Award className="h-3 w-3" />
            {sortedMatches.length} matches found
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Based on your assessment results, here are careers that match your interests, abilities, and skills.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedMatches.map((match, index) => (
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
                <span>Match #{index + 1}</span>
                <span>Correlation: {((match.correlation || 0) * 100).toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
        
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Based on {recommendations.category || 'comprehensive'} analysis
            </p>
            <Button onClick={handleRetry} variant="outline" size="sm">
              Refresh Analysis
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}