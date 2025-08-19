import React from "react";
import { NavigationBar } from "../components/NavigationBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";

export default function KnowledgeTestResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const { testTitle, result } = location.state || {};

  if (!result) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">No Results Found</h1>
            <Button onClick={() => navigate("/knowledge-selection")}>
              Back to Knowledge Tests
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold">{testTitle} Results</h1>
            <Button onClick={() => navigate("/knowledge-selection")}>
              Back to Knowledge Tests
            </Button>
          </div>

          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Your Score</h2>
                <div className="text-5xl font-bold text-primary">
                  {result.score}/100
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4">Analysis</h2>
                <p className="text-lg text-muted-foreground">
                  {result.analysis}
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4">Recommendations</h2>
                <ul className="list-disc pl-6 space-y-2">
                  {result.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-lg text-muted-foreground">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
