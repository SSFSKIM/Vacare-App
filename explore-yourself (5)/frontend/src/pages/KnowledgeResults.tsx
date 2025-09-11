import React from "react";
import { NavigationBar } from "../components/NavigationBar";
import { Card } from "@/components/ui/card";
import { useLocation } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface KnowledgeResult {
  category: string;
  score: number;
  areas: {
    name: string;
    score: number;
    interpretation: string;
  }[];
}

const getInterpretation = (score: number): string => {
  if (score >= 90) return "Expert Level";
  if (score >= 70) return "Advanced Level";
  if (score >= 50) return "Intermediate Level";
  if (score >= 30) return "Basic Level";
  return "Beginner Level";
};

const categoryMapping: { [key: string]: string[] } = {
  "Arts and Humanities": ["Philosophy and Theology", "Foreign Language", "English Language", "History and Archeology", "Fine Arts"],
  "Business and Management": ["Customer and Personal Service", "Administrative", "Sales and Marketing", "Administration and Management", "Personnel and Human Resources", "Economics and Accounting"],
  "Communications": ["Telecommunications", "Communications and Media"],
  "Education and Training": ["Education and Training", "Therapy and Counseling"],
  "Engineering and Technology": ["Design", "Computers and Electronics", "Building and Construction", "Engineering and Technology", "Mechanical"],
  "Health Services": ["Medicine and Dentistry", "Psychology"],
  "Law and Public Safety": ["Public Safety and Security", "Law and Government"],
  "Manufacturing and Production": ["Production and Processing", "Food Production"],
  "Mathematics and Science": ["Chemistry", "Mathematics", "Biology", "Physics", "Geography"],
  "Transportation": ["Transportation"]
};

export default function KnowledgeResults() {
  const location = useLocation();
  const results = location.state?.results || [];

  // Process results into categories
  const processedResults: KnowledgeResult[] = Object.entries(categoryMapping).map(([category, areas]) => {
    const categoryAreas = results.filter((r: any) => areas.includes(r.name));
    const averageScore = categoryAreas.length > 0
      ? Math.round(categoryAreas.reduce((acc: number, curr: any) => acc + curr.score, 0) / categoryAreas.length)
      : 0;

    return {
      category,
      score: averageScore,
      areas: categoryAreas.map((area: any) => ({
        name: area.name,
        score: area.score,
        interpretation: getInterpretation(area.score)
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
          <h1 className="text-4xl font-bold mb-8 text-center">Your Knowledge Assessment Results</h1>
          
          {/* Overall Results Chart */}
          <Card className="p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-6">Overall Knowledge Profile</h2>
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
                  {result.category}
                  <span className="ml-2 text-lg text-muted-foreground">
                    (Overall: {result.score}%)
                  </span>
                </h2>
                <div className="space-y-4">
                  {result.areas.map((area) => (
                    <div key={area.name} className="border-l-4 border-primary pl-4">
                      <h3 className="text-xl font-medium">{area.name}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex-1 bg-muted rounded-full h-4">
                          <div
                            className="bg-primary h-4 rounded-full"
                            style={{ width: `${area.score}%` }}
                          />
                        </div>
                        <span className="text-lg font-medium w-16">{area.score}%</span>
                      </div>
                      <p className="text-muted-foreground mt-1">{area.interpretation}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Summary and Recommendations */}
          <Card className="p-6 mt-8">
            <h2 className="text-2xl font-semibold mb-4">Summary and Recommendations</h2>
            <div className="space-y-4">
              <p className="text-lg">
                Your strongest knowledge areas are in:
              </p>
              <ul className="list-disc list-inside space-y-2">
                {sortedResults.slice(0, 3).map((result) => (
                  <li key={result.category}>
                    <span className="font-medium">{result.category}</span> ({result.score}%)
                  </li>
                ))}
              </ul>
              <p className="text-lg mt-4">
                Consider exploring careers that leverage your knowledge in these areas.
                You might also want to focus on developing your knowledge in areas where you scored lower
                if they align with your career goals.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
