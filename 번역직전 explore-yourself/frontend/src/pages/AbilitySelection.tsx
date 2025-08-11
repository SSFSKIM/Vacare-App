import React, { useEffect } from "react";
import { NavigationBar } from "../components/NavigationBar";
import { TestCard } from "../components/TestCard";
import { Brain, Activity, Gauge, Eye } from "lucide-react";
import { initializeFirebaseAssessment } from "../utils/firebase-assessment-store";

export default function AbilitySelection() {
  // Initialize Firebase assessment store
  useEffect(() => {
    initializeFirebaseAssessment();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-6">
              Ability Explorer
            </h1>
            <p className="text-xl text-muted-foreground">
              Select the category to begin. Start with what you want
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <TestCard
              title="Cognitive Abilities"
              icon={<Brain />}
              testType="cognitive-ability"
              available={true}
            />
            <TestCard
              title="Physical Abilities"
              icon={<Activity />}
              testType="physical-ability"
              available={true}
            />
            <TestCard
              title="Psychomotor Abilities"
              icon={<Gauge />}
              testType="psychomotor-ability"
              available={true}
            />
            <TestCard
              title="Sensory Abilities"
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
