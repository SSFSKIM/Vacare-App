import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { InterestResult } from "ui/src/types";

const riasecDescriptions: Record<string, { title: string; description: string }> =
  {
    realistic: {
      title: "Realistic (Doers)",
      description:
        "You enjoy practical, hands-on problems and solutions. You like working with tools, objects, machines, and animals.",
    },
    investigative: {
      title: "Investigative (Thinkers)",
      description:
        "You enjoy working with ideas and require a great deal of thinking. You like to search for facts and figure out problems mentally.",
    },
    artistic: {
      title: "Artistic (Creators)",
      description:
        "You have artistic, innovating, or intuitional abilities and like to work in unstructured situations using your imagination and creativity.",
    },
    social: {
      title: "Social (Helpers)",
      description:
        "You like to work with people to enlighten, inform, help, train, or cure them, or are skilled with words.",
    },
    enterprising: {
      title: "Enterprising (Persuaders)",
      description:
        "You like to work with people, influencing, persuading, performing, leading or managing for organizational goals or economic gain.",
    },
    conventional: {
      title: "Conventional (Organizers)",
      description:
        "You like to work with data, have clerical or numerical ability, carry out tasks in detail or follow through on others' instructions.",
    },
  };

export const InterestResults = ({ results = [] }: { results: InterestResult[] }) => {
  // Find the highest score to determine the top interest
  const topInterest = results.reduce(
    (max, current) => (current.score > max.score ? current : max),
    { name: "", score: -1 },
  );

  const primaryInterest = results
    .filter((r) => r && r.category)
    .reduce(
      (max, current) => (current.score > max.score ? current : max),
      { category: "N/A", score: 0 },
    );

  const primaryInterestTitle =
    primaryInterest.category &&
    (riasecDescriptions[primaryInterest.category.toLowerCase()]?.title ||
      primaryInterest.category);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interest Profile</CardTitle>
        <p className="text-sm text-muted-foreground">
          Based on your answers, your primary interest area is{" "}
          <span className="font-semibold text-primary">
            {(topInterest.name &&
              riasecDescriptions[topInterest.name.toLowerCase()]?.title) ||
              topInterest.name}
          </span>
          .
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {results
            .filter((result) => result && result.category)
            .sort((a, b) => b.score - a.score)
            .map((result) => {
              const details =
                (result.category &&
                  riasecDescriptions[result.category.toLowerCase()]) ||
                ({
                  title: result.category,
                  description: "No description available.",
                } as any);
              return (
                <div key={result.category}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-md font-semibold">{details.title}</h3>
                    <span className="text-sm font-bold text-foreground">
                      {result.score}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {details.description}
                  </p>
                  <Progress value={result.score} className="h-2" />
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
