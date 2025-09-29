import React, { useEffect } from "react";
import { NavigationBar } from "../components/NavigationBar";
import { TestCard } from "../components/TestCard";
import { Palette, Building2, Radio, GraduationCap, Wrench, Stethoscope, Scale, Factory, Calculator, Car } from "lucide-react";
import { initializeFirebaseAssessment } from "../utils/firebase-assessment-store";
import { useTranslation } from "react-i18next";

export default function KnowledgeSelection() {
  // Initialize Firebase assessment store
  useEffect(() => {
    initializeFirebaseAssessment();
  }, []);

  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-6">
              {t('assessmentSelection.knowledge.title')}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t('assessmentSelection.knowledge.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <TestCard
              title={t('assessmentSelection.knowledge.cards.artsHumanities')}
              description={t('assessmentSelection.knowledge.descriptions.artsHumanities')}
              icon={<Palette />}
              testType="arts-humanities-knowledge"
              available={true}
            />
            <TestCard
              title={t('assessmentSelection.knowledge.cards.businessManagement')}
              description={t('assessmentSelection.knowledge.descriptions.businessManagement')}
              icon={<Building2 />}
              testType="business-management-knowledge"
              available={true}
            />
            <TestCard
              title={t('assessmentSelection.knowledge.cards.communications')}
              description={t('assessmentSelection.knowledge.descriptions.communications')}
              icon={<Radio />}
              testType="communications-knowledge"
              available={true}
            />
            <TestCard
              title={t('assessmentSelection.knowledge.cards.educationTraining')}
              description={t('assessmentSelection.knowledge.descriptions.educationTraining')}
              icon={<GraduationCap />}
              testType="education-training-knowledge"
              available={true}
            />
            <TestCard
              title={t('assessmentSelection.knowledge.cards.engineeringTechnology')}
              description={t('assessmentSelection.knowledge.descriptions.engineeringTechnology')}
              icon={<Wrench />}
              testType="engineering-technology-knowledge"
              available={true}
            />
            <TestCard
              title={t('assessmentSelection.knowledge.cards.healthServices')}
              description={t('assessmentSelection.knowledge.descriptions.healthServices')}
              icon={<Stethoscope />}
              testType="health-services-knowledge"
              available={true}
            />
            <TestCard
              title={t('assessmentSelection.knowledge.cards.lawSafety')}
              description={t('assessmentSelection.knowledge.descriptions.lawSafety')}
              icon={<Scale />}
              testType="law-safety-knowledge"
              available={true}
            />
            <TestCard
              title={t('assessmentSelection.knowledge.cards.manufacturingProduction')}
              description={t('assessmentSelection.knowledge.descriptions.manufacturingProduction')}
              icon={<Factory />}
              testType="manufacturing-production-knowledge"
              available={true}
            />
            <TestCard
              title={t('assessmentSelection.knowledge.cards.mathScience')}
              description={t('assessmentSelection.knowledge.descriptions.mathScience')}
              icon={<Calculator />}
              testType="math-science-knowledge"
              available={true}
            />
            <TestCard
              title={t('assessmentSelection.knowledge.cards.transportation')}
              description={t('assessmentSelection.knowledge.descriptions.transportation')}
              icon={<Car />}
              testType="transportation-knowledge"
              available={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
