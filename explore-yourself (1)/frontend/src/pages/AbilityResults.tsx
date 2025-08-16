import React from "react";
import { NavigationBar } from "../components/NavigationBar";
import { Card } from "@/components/ui/card";
import { useLocation } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AbilityResult {
  category: string;
  score: number;
  abilities: {
    name: string;
    score: number;
    interpretation: string;
  }[];
}

const getInterpretation = (score: number): string => {
  if (score >= 90) return "Exceptional Proficiency";
  if (score >= 70) return "High Proficiency";
  if (score >= 50) return "Moderate Proficiency";
  if (score >= 30) return "Developing Proficiency";
  return "Basic Proficiency";
};

const categoryMapping: { [key: string]: string[] } = {
  "Cognitive": [
    "Oral Comprehension",
    "Written Comprehension",
    "Oral Expression",
    "Written Expression",
    "Fluency of Ideas",
    "Originality",
    "Problem Sensitivity",
    "Deductive Reasoning",
    "Inductive Reasoning",
    "Information Ordering",
    "Category Flexibility",
    "Mathematical Reasoning",
    "Number Facility",
    "Memorization",
    "Speed of Closure",
    "Flexibility of Closure",
    "Perceptual Speed",
    "Spatial Orientation",
    "Visualization",
    "Selective Attention",
    "Time Sharing"
  ],
  "Physical": [
    "Static Strength",
    "Explosive Strength",
    "Dynamic Strength",
    "Trunk Strength",
    "Stamina",
    "Extent Flexibility",
    "Dynamic Flexibility",
    "Gross Body Coordination",
    "Gross Body Equilibrium"
  ],
  "Psychomotor": [
    "Arm-Hand Steadiness",
    "Manual Dexterity",
    "Finger Dexterity",
    "Control Precision",
    "Multilimb Coordination",
    "Response Orientation",
    "Rate Control",
    "Reaction Time",
    "Wrist-Finger Speed",
    "Speed of Limb Movement"
  ],
  "Sensory": [
    "Near Vision",
    "Far Vision",
    "Visual Color Discrimination",
    "Night Vision",
    "Peripheral Vision",
    "Depth Perception",
    "Glare Sensitivity",
    "Hearing Sensitivity",
    "Auditory Attention",
    "Sound Localization",
    "Speech Recognition",
    "Speech Clarity"
  ]
};

export default function AbilityResults() {
  const location = useLocation();
  const results = location.state?.results || [];

  // Process results into categories
  const processedResults: AbilityResult[] = Object.entries(categoryMapping).map(([category, abilities]) => {
    const categoryAbilities = results.filter((r: any) => abilities.includes(r.name));
    const averageScore = categoryAbilities.length > 0
      ? Math.round(categoryAbilities.reduce((acc: number, curr: any) => acc + curr.score, 0) / categoryAbilities.length)
      : 0;

    return {
      category,
      score: averageScore,
      abilities: categoryAbilities.map((ability: any) => ({
        name: ability.name,
        score: ability.score,
        interpretation: getInterpretation(ability.score)
      }))
    };
  });

  // Sort categories by score
  const sortedResults = [...processedResults].sort((a, b) => b.score - a.score);

  // Prepare data for the chart
  const chartData = sortedResults.map(result => ({
    name: result.category,
    score: result.score
  }));

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Your Ability Assessment Results</h1>
          
          {/* Overall Results Chart */}
          <Card className="p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-6">Overall Ability Profile</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Detailed Results by Category */}
          <div className="space-y-8">
            {sortedResults.map((result) => (
              <Card key={result.category} className="p-6">
                <h2 className="text-2xl font-semibold mb-4">
                  {result.category} Abilities
                  <span className="ml-2 text-lg text-muted-foreground">
                    (Overall: {result.score}%)
                  </span>
                </h2>
                <div className="space-y-4">
                  {result.abilities.map((ability) => (
                    <div key={ability.name} className="border-l-4 border-primary pl-4">
                      <h3 className="text-xl font-medium">{ability.name}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex-1 bg-muted rounded-full h-4">
                          <div
                            className="bg-primary h-4 rounded-full"
                            style={{ width: `${ability.score}%` }}
                          />
                        </div>
                        <span className="text-lg font-medium w-16">{ability.score}%</span>
                      </div>
                      <p className="text-muted-foreground mt-1">{ability.interpretation}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Summary and Recommendations */}
          <Card className="p-6 mt-8">
            <h2 className="text-2xl font-semibold mb-4">Summary and Career Implications</h2>
            <div className="space-y-4">
              <p className="text-lg">
                Your strongest ability categories are:
              </p>
              <ul className="list-disc list-inside space-y-2">
                {sortedResults.slice(0, 3).map((result) => (
                  <li key={result.category}>
                    <span className="font-medium">{result.category}</span> ({result.score}%) - Featuring strong abilities in{' '}
                    {result.abilities
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 2)
                      .map((ability, index) => (
                        <span key={ability.name}>
                          {index > 0 ? ' and ' : ''}
                          {ability.name} ({ability.score}%)
                        </span>
                      ))}
                  </li>
                ))}
              </ul>
              <p className="text-lg mt-4">
                Consider exploring careers that leverage your strongest abilities.
                These abilities can be valuable assets in various professional contexts,
                and understanding your strengths can help you make informed career decisions.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
