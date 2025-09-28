import React, { useEffect } from "react";
import { NavigationBar } from "../components/NavigationBar";
import { TestCard } from "../components/TestCard";
import { Brain, Activity, Gauge, Eye } from "lucide-react";
import { initializeFirebaseAssessment } from "../utils/firebase-assessment-store";
import { useTranslation } from "react-i18next";

export default function AbilitySelection() {
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
              {t('assessmentSelection.ability.title')}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t('assessmentSelection.ability.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <TestCard
              title={t('assessmentSelection.ability.cards.cognitive')}
              icon={<Brain />}
              testType="cognitive-ability"
              available={true}
            />
            <TestCard
              title={t('assessmentSelection.ability.cards.physical')}
              icon={<Activity />}
              testType="physical-ability"
              available={true}
            />
            <TestCard
              title={t('assessmentSelection.ability.cards.psychomotor')}
              icon={<Gauge />}
              testType="psychomotor-ability"
              available={true}
            />
            <TestCard
              title={t('assessmentSelection.ability.cards.sensory')}
              icon={<Eye />}
              testType="sensory-ability"
              available={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
