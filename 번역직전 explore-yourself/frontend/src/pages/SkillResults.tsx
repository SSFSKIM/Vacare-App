import React from "react";
import { NavigationBar } from "../components/NavigationBar";
import { Card } from "@/components/ui/card";
import { useLocation } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SkillResult {
  category: string;
  score: number;
  skills: {
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
  // Basic Skills - Content
  "Content Skills": [
    "Active Listening",
    "Mathematics",
    "Reading Comprehension",
    "Science",
    "Speaking",
    "Writing"
  ],
  // Basic Skills - Process
  "Process Skills": [
    "Active Learning",
    "Critical Thinking",
    "Learning Strategies",
    "Monitoring"
  ],
  // Cross-functional Skills - Complex Problem Solving
  "Complex Problem Solving": [
    "Complex Problem Solving"
  ],
  // Cross-functional Skills - Resource Management
  "Resource Management": [
    "Management of Financial Resources",
    "Management of Material Resources",
    "Management of Personnel Resources",
    "Time Management"
  ],
  // Cross-functional Skills - Social
  "Social Skills": [
    "Coordination",
    "Instructing",
    "Negotiation",
    "Persuasion",
    "Service Orientation",
    "Social Perceptiveness"
  ],
  // Cross-functional Skills - Systems
  "Systems Skills": [
    "Judgment and Decision Making",
    "Systems Analysis",
    "Systems Evaluation"
  ],
  // Cross-functional Skills - Technical
  "Technical Skills": [
    "Equipment Maintenance",
    "Equipment Selection",
    "Installation",
    "Operation and Control",
    "Operations Analysis",
    "Operations Monitoring",
    "Programming",
    "Quality Control Analysis",
    "Repairing",
    "Technology Design",
    "Troubleshooting"
  ]
};

const skillCategories = {
  "Basic Skills": ["Content Skills", "Process Skills"],
  "Cross-functional Skills": [
    "Complex Problem Solving",
    "Resource Management",
    "Social Skills",
    "Systems Skills",
    "Technical Skills"
  ]
};

export default function SkillResults() {
  const location = useLocation();
  const results = location.state?.results || [];

  // Process results into categories
  const processedResults: SkillResult[] = Object.entries(categoryMapping).map(([category, skills]) => {
    const categorySkills = results.filter((r: any) => skills.includes(r.name));
    const averageScore = categorySkills.length > 0
      ? Math.round(categorySkills.reduce((acc: number, curr: any) => acc + curr.score, 0) / categorySkills.length)
      : 0;

    return {
      category,
      score: averageScore,
      skills: categorySkills.map((skill: any) => ({
        name: skill.name,
        score: skill.score,
        interpretation: getInterpretation(skill.score)
      }))
    };
  });

  // Calculate major category averages
  const majorCategoryAverages = Object.entries(skillCategories).map(([majorCategory, subCategories]) => {
    const relevantResults = processedResults.filter(r => subCategories.includes(r.category));
    const averageScore = relevantResults.length > 0
      ? Math.round(relevantResults.reduce((acc, curr) => acc + curr.score, 0) / relevantResults.length)
      : 0;

    return {
      name: majorCategory,
      score: averageScore
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Your Skills Assessment Results</h1>
          
          {/* Overall Skills Profile */}
          <Card className="p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-6">Overall Skills Profile</h2>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={majorCategoryAverages} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Basic Skills Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-semibold mb-6">Basic Skills</h2>
            
            {skillCategories["Basic Skills"].map(category => {
              const categoryResult = processedResults.find(r => r.category === category);
              if (!categoryResult) return null;

              return (
                <Card key={category} className="p-6 mb-6">
                  <h3 className="text-2xl font-semibold mb-4">
                    {category}
                    <span className="ml-2 text-lg text-muted-foreground">
                      (Average: {categoryResult.score}%)
                    </span>
                  </h3>
                  <div className="space-y-4">
                    {categoryResult.skills.map((skill) => (
                      <div key={skill.name} className="border-l-4 border-primary pl-4">
                        <h4 className="text-xl font-medium">{skill.name}</h4>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex-1 bg-muted rounded-full h-4">
                            <div
                              className="bg-primary h-4 rounded-full"
                              style={{ width: `${skill.score}%` }}
                            />
                          </div>
                          <span className="text-lg font-medium w-16">{skill.score}%</span>
                        </div>
                        <p className="text-muted-foreground mt-1">{skill.interpretation}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Cross-functional Skills Section */}
          <div>
            <h2 className="text-3xl font-semibold mb-6">Cross-functional Skills</h2>
            
            {skillCategories["Cross-functional Skills"].map(category => {
              const categoryResult = processedResults.find(r => r.category === category);
              if (!categoryResult) return null;

              return (
                <Card key={category} className="p-6 mb-6">
                  <h3 className="text-2xl font-semibold mb-4">
                    {category}
                    <span className="ml-2 text-lg text-muted-foreground">
                      (Average: {categoryResult.score}%)
                    </span>
                  </h3>
                  <div className="space-y-4">
                    {categoryResult.skills.map((skill) => (
                      <div key={skill.name} className="border-l-4 border-primary pl-4">
                        <h4 className="text-xl font-medium">{skill.name}</h4>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex-1 bg-muted rounded-full h-4">
                            <div
                              className="bg-primary h-4 rounded-full"
                              style={{ width: `${skill.score}%` }}
                            />
                          </div>
                          <span className="text-lg font-medium w-16">{skill.score}%</span>
                        </div>
                        <p className="text-muted-foreground mt-1">{skill.interpretation}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Summary Section */}
          <Card className="p-6 mt-8">
            <h2 className="text-2xl font-semibold mb-4">Summary and Career Implications</h2>
            <div className="space-y-4">
              <p className="text-lg">
                Your strongest skill categories are:
              </p>
              <ul className="list-disc list-inside space-y-2">
                {[...processedResults]
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 3)
                  .map((result) => (
                    <li key={result.category}>
                      <span className="font-medium">{result.category}</span> ({result.score}%) - Featuring strong skills in{' '}
                      {result.skills
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 2)
                        .map((skill, index) => (
                          <span key={skill.name}>
                            {index > 0 ? ' and ' : ''}
                            {skill.name} ({skill.score}%)
                          </span>
                        ))}
                    </li>
                  ))}
              </ul>
              <p className="text-lg mt-4">
                These skills are valuable assets in various professional contexts.
                Consider exploring careers that leverage your strongest skills,
                particularly in areas where you show advanced or expert level proficiency.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
