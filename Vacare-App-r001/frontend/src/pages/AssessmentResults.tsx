import React from "react";
import { NavigationBar } from "../components/NavigationBar";
import { Card } from "@/components/ui/card";
import { useLocation } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SectionResult {
  name: string;
  score: number;
  subsections: {
    name: string;
    score: number;
    interpretation: string;
    abbr?: string; // Optional abbreviation for chart labels
  }[];
}

const getInterpretation = (score: number): string => {
  if (score >= 90) return "Exceptional";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Moderate";
  if (score >= 30) return "Developing";
  return "Basic";
};

export default function AssessmentResults() {
  const location = useLocation();
  const {
    interestResults = [],
    abilityResults = [],
    knowledgeResults = [],
    skillResults = []
  } = location.state || {};

  // Process all results into sections
  const sections: SectionResult[] = [
    {
      name: "Interests",
      score: interestResults.length > 0
        ? Math.round(interestResults.reduce((acc: number, curr: any) => acc + curr.score, 0) / interestResults.length)
        : 0,
      subsections: interestResults.map((result: any) => ({
        name: result.name, // Keep full name 
        abbr: result.name.charAt(0), // Abbreviation for chart axis
        score: result.score,
        interpretation: getInterpretation(result.score)
      }))
    },
    {
      name: "Abilities",
      score: abilityResults.length > 0
        ? Math.round(abilityResults.reduce((acc: number, curr: any) => acc + curr.score, 0) / abilityResults.length)
        : 0,
      subsections: abilityResults.map((result: any) => ({
        name: result.name,
        score: result.score,
        interpretation: getInterpretation(result.score)
      }))
    },
    {
      name: "Knowledge",
      score: knowledgeResults.length > 0
        ? Math.round(knowledgeResults.reduce((acc: number, curr: any) => acc + curr.score, 0) / knowledgeResults.length)
        : 0,
      subsections: knowledgeResults.map((result: any) => ({
        name: result.name,
        score: result.score,
        interpretation: getInterpretation(result.score)
      }))
    },
    {
      name: "Skills",
      score: skillResults.length > 0
        ? Math.round(skillResults.reduce((acc: number, curr: any) => acc + curr.score, 0) / skillResults.length)
        : 0,
      subsections: skillResults.map((result: any) => ({
        name: result.name,
        score: result.score,
        interpretation: getInterpretation(result.score)
      }))
    }
  ];

  // Prepare data for the overview chart
  const overviewChartData = sections.map(section => ({
    name: section.name,
    score: section.score
  }));

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Your Career Assessment Results</h1>
          
          {/* Overall Profile Chart */}
          <Card className="p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-6">Overall Assessment Profile</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overviewChartData} margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Detailed Results Tabs */}
          <Tabs defaultValue="interests" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              {sections.map((section) => (
                <TabsTrigger key={section.name.toLowerCase()} value={section.name.toLowerCase()}>
                  {section.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {sections.map((section) => (
              <TabsContent key={section.name.toLowerCase()} value={section.name.toLowerCase()}>
                <Card className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">
                    {section.name} Assessment
                    <span className="ml-2 text-lg text-muted-foreground">
                      (Overall: {section.score}%)
                    </span>
                  </h2>
                  
                  <div className="space-y-6">
                    {/* Conditional rendering for Interests vs other sections */}
                    {section.name === "Interests" ? (
                      // Interests: Horizontal Bar Chart Only
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={section.subsections} 
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="abbr" type="category" /> 
                            <YAxis type="number" domain={[0, 'auto']} allowDataOverflow={true} /> 
                            <Tooltip />
                            <Bar dataKey="score" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      // Other Sections: Vertical Bar Chart + Detailed List
                      <>
                        {/* Subsection Chart (Vertical) */}
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={section.subsections} 
                              layout="vertical"
                              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" domain={[0, 100]} />
                              <YAxis dataKey="name" type="category" width={100} />
                              <Tooltip />
                              <Bar dataKey="score" fill="#8884d8" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Detailed Subsection Scores */}
                        <div className="space-y-4 mt-6"> 
                          {section.subsections.map((subsection) => (
                            <div key={subsection.name} className="border-l-4 border-primary pl-4">
                              <h3 className="text-xl font-medium">{subsection.name}</h3>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex-1 bg-muted rounded-full h-4">
                                  <div
                                    className="bg-primary h-4 rounded-full"
                                    style={{ width: `${subsection.score}%` }}
                                  />
                                </div>
                                <span className="text-lg font-medium w-16">{subsection.score}%</span>
                              </div>
                              <p className="text-muted-foreground mt-1">{subsection.interpretation}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* Summary and Recommendations */}
          <Card className="p-6 mt-8">
            <h2 className="text-2xl font-semibold mb-4">Summary and Career Implications</h2>
            <div className="space-y-4">
              <p className="text-lg">
                Based on your assessment results:
              </p>
              <ul className="list-disc list-inside space-y-2">
                {sections.map((section) => {
                  const topSubsections = [...section.subsections]
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 2);
                  
                  return (
                    <li key={section.name}>
                      <span className="font-medium">{section.name}:</span> You show particular strength in{' '}
                      {topSubsections.map((sub, index) => (
                        <span key={sub.name}>
                          {index > 0 ? ' and ' : ''}
                          {sub.name} ({sub.score}%)
                        </span>
                      ))}
                    </li>
                  );
                })}
              </ul>
              <p className="text-lg mt-4">
                Consider exploring careers that align with your strongest areas across all dimensions.
                Your combination of interests, abilities, knowledge, and skills suggests you might excel in roles that require these capabilities.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
