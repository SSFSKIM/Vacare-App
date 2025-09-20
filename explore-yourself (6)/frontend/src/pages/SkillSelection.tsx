import React, { useEffect, useState } from "react";
import { NavigationBar } from "../components/NavigationBar";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { initializeFirebaseAssessment, useFirebaseAssessmentStore } from "../utils/firebase-assessment-store";

export default function SkillSelection() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { assessment, isLoading, error } = useFirebaseAssessmentStore();
  const [completedTests, setCompletedTests] = useState<any[]>([]);
  
  // Initialize Firebase assessment store
  useEffect(() => {
    initializeFirebaseAssessment();
  }, []);
  
  // Extract completed skill tests from Firebase store
  useEffect(() => {
    if (!isLoading && assessment) {
      setLoading(false);
      const skillResults = assessment.skills.results || [];
      setCompletedTests(skillResults);
    }
  }, [isLoading, assessment]);

  const skillCategories = [
    {
      title: "Basic Skills",
      description: "Fundamental capacities that facilitate learning or the more rapid acquisition of knowledge",
      subcategories: [
        {
          name: "Content Skills",
          route: "/content-skills-test",
          description: "Background structures needed to work with and acquire more specific skills in a variety of different domains"
        },
        {
          name: "Process Skills",
          route: "/process-skills-test",
          description: "Procedures that contribute to the more rapid acquisition of knowledge and skill across a variety of domains"
        }
      ]
    },
    {
      title: "Cross-functional Skills",
      description: "Developed capacities that facilitate performance of activities that occur across jobs",
      subcategories: [
        {
          name: "Complex Problem Solving",
          route: "/complex-problem-solving-skills-test",
          description: "Developed capacities used to solve novel, ill-defined problems in complex, real-world settings"
        },
        {
          name: "Resource Management",
          route: "/resource-management-skills-test",
          description: "Developed capacities used to allocate resources efficiently"
        },
        {
          name: "Social Skills",
          route: "/social-skills-test",
          description: "Developed capacities used to work with people to achieve goals"
        },
        {
          name: "Systems Skills",
          route: "/systems-skills-test",
          description: "Developed capacities used to understand, monitor, and improve socio-technical systems"
        },
        {
          name: "Technical Skills",
          route: "/technical-skills-test",
          description: "Developed capacities used to design, set-up, operate, and correct malfunctions involving application of machines or technological systems"
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Skill Test</h1>
          <p className="text-lg text-muted-foreground mb-8 text-center">
            Select a skill category to begin the assessment.
            <br />
            You can start with the category that you want.
          </p>

          <div className="space-y-8">
            {skillCategories.map((category) => (
              <div key={category.title}>
                <h2 className="text-2xl font-semibold mb-4">{category.title}</h2>
                <p className="text-muted-foreground mb-4">{category.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.subcategories.map((subcategory) => (
                    <Card
                      key={subcategory.name}
                      className={`p-6 hover:bg-accent cursor-pointer transition-colors relative ${completedTests.some((result: any) => {
                      let expectedSubset = subcategory.name.toLowerCase();
                      if (["content skills", "process skills", "social skills", "systems skills", "technical skills"].includes(expectedSubset)) {
                        expectedSubset = expectedSubset.replace(" skills", "");
                      }
                      return result.subset?.toLowerCase() === expectedSubset;
                    }) ? 'bg-accent border-l-4 border-primary' : ''}`}
                      onClick={() => navigate(subcategory.route)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold">{subcategory.name}</h3>
                            {completedTests.some((result: any) => {
                              let expectedSubset = subcategory.name.toLowerCase();
                              if (["content skills", "process skills", "social skills", "systems skills", "technical skills"].includes(expectedSubset)) {
                                expectedSubset = expectedSubset.replace(" skills", "");
                              }
                              return result.subset?.toLowerCase() === expectedSubset;
                            }) && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completed
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground">{subcategory.description}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
