import React, { useEffect, useMemo, useState } from "react";
import { NavigationBar } from "../components/NavigationBar";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { initializeFirebaseAssessment, useFirebaseAssessmentStore } from "../utils/firebase-assessment-store";
import { useTranslation } from "react-i18next";

export default function SkillSelection() {
  const navigate = useNavigate();
  const { assessment, isLoading } = useFirebaseAssessmentStore();
  const [completedTests, setCompletedTests] = useState<any[]>([]);
  const { t } = useTranslation();
  
  // Initialize Firebase assessment store
  useEffect(() => {
    initializeFirebaseAssessment();
  }, []);
  
  // Extract completed skill tests from Firebase store
  useEffect(() => {
    if (!isLoading && assessment) {
      const skillResults = assessment.skills.results || [];
      setCompletedTests(skillResults);
    }
  }, [isLoading, assessment]);

  const skillCategories = useMemo(
    () => [
      {
        key: 'basic',
        title: t('assessmentSelection.skills.categories.basic.title'),
        description: t('assessmentSelection.skills.categories.basic.description'),
        subcategories: [
          {
            key: 'content',
            name: t('assessmentSelection.skills.categories.basic.subcategories.content.title'),
            description: t('assessmentSelection.skills.categories.basic.subcategories.content.description'),
            route: '/content-skills-test',
            subsetKey: 'content'
          },
          {
            key: 'process',
            name: t('assessmentSelection.skills.categories.basic.subcategories.process.title'),
            description: t('assessmentSelection.skills.categories.basic.subcategories.process.description'),
            route: '/process-skills-test',
            subsetKey: 'process'
          }
        ]
      },
      {
        key: 'crossFunctional',
        title: t('assessmentSelection.skills.categories.crossFunctional.title'),
        description: t('assessmentSelection.skills.categories.crossFunctional.description'),
        subcategories: [
          {
            key: 'complexProblemSolving',
            name: t('assessmentSelection.skills.categories.crossFunctional.subcategories.complexProblemSolving.title'),
            description: t('assessmentSelection.skills.categories.crossFunctional.subcategories.complexProblemSolving.description'),
            route: '/complex-problem-solving-skills-test',
            subsetKey: 'complex problem solving'
          },
          {
            key: 'resourceManagement',
            name: t('assessmentSelection.skills.categories.crossFunctional.subcategories.resourceManagement.title'),
            description: t('assessmentSelection.skills.categories.crossFunctional.subcategories.resourceManagement.description'),
            route: '/resource-management-skills-test',
            subsetKey: 'resource management'
          },
          {
            key: 'social',
            name: t('assessmentSelection.skills.categories.crossFunctional.subcategories.social.title'),
            description: t('assessmentSelection.skills.categories.crossFunctional.subcategories.social.description'),
            route: '/social-skills-test',
            subsetKey: 'social'
          },
          {
            key: 'systems',
            name: t('assessmentSelection.skills.categories.crossFunctional.subcategories.systems.title'),
            description: t('assessmentSelection.skills.categories.crossFunctional.subcategories.systems.description'),
            route: '/systems-skills-test',
            subsetKey: 'systems'
          },
          {
            key: 'technical',
            name: t('assessmentSelection.skills.categories.crossFunctional.subcategories.technical.title'),
            description: t('assessmentSelection.skills.categories.crossFunctional.subcategories.technical.description'),
            route: '/technical-skills-test',
            subsetKey: 'technical'
          }
        ]
      }
    ],
    [t]
  );

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">{t('assessmentSelection.skills.title')}</h1>
          <p className="text-lg text-muted-foreground mb-8 text-center">
            {t('assessmentSelection.skills.subtitleLine1')}
            <br />
            {t('assessmentSelection.skills.subtitleLine2')}
          </p>

          <div className="space-y-8">
            {skillCategories.map((category) => (
              <div key={category.key}>
                <h2 className="text-2xl font-semibold mb-4">{category.title}</h2>
                <p className="text-muted-foreground mb-4">{category.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.subcategories.map((subcategory) => (
                    <Card
                      key={subcategory.key}
                      className={`p-6 hover:bg-accent cursor-pointer transition-colors relative ${completedTests.some((result: any) => {
                      return result.subset?.toLowerCase() === subcategory.subsetKey;
                    }) ? 'bg-accent border-l-4 border-primary' : ''}`}
                      onClick={() => navigate(subcategory.route)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold">{subcategory.name}</h3>
                            {completedTests.some((result: any) => {
                              return result.subset?.toLowerCase() === subcategory.subsetKey;
                            }) && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {t('assessmentSelection.skills.completedBadge')}
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
