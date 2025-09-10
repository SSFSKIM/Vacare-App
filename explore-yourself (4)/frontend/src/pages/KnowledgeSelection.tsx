import React, { useEffect } from "react";
import { NavigationBar } from "../components/NavigationBar";
import { TestCard } from "../components/TestCard";
import { Palette, Building2, Radio, GraduationCap, Wrench, Stethoscope, Scale, Factory, Calculator, Car } from "lucide-react";
import { initializeFirebaseAssessment } from "../utils/firebase-assessment-store";

export default function KnowledgeSelection() {
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
              Knowledge Explorer
            </h1>
            <p className="text-xl text-muted-foreground">
              Select the category to begin. Start with what you want
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <TestCard
              title="Arts and Humanities"
              icon={<Palette />}
              testType="arts-humanities-knowledge"
              available={true}
            />
            <TestCard
              title="Business and Management"
              icon={<Building2 />}
              testType="business-management-knowledge"
              available={true}
            />
            <TestCard
              title="Communications"
              icon={<Radio />}
              testType="communications-knowledge"
              available={true}
            />
            <TestCard
              title="Education and Training"
              icon={<GraduationCap />}
              testType="education-training-knowledge"
              available={true}
            />
            <TestCard
              title="Engineering and Technology"
              icon={<Wrench />}
              testType="engineering-technology-knowledge"
              available={true}
            />
            <TestCard
              title="Health Services"
              icon={<Stethoscope />}
              testType="health-services-knowledge"
              available={true}
            />
            <TestCard
              title="Law and Public Safety"
              icon={<Scale />}
              testType="law-safety-knowledge"
              available={true}
            />
            <TestCard
              title="Manufacturing and Production"
              icon={<Factory />}
              testType="manufacturing-production-knowledge"
              available={true}
            />
            <TestCard
              title="Mathematics and Science"
              icon={<Calculator />}
              testType="math-science-knowledge"
              available={true}
            />
            <TestCard
              title="Transportation"
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
