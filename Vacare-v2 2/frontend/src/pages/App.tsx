import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "../components/AuthProvider";
import { NavigationBar } from "../components/NavigationBar";
import { TestCard } from "../components/TestCard";
import { Brain, Lightbulb, GraduationCap, Wrench } from "lucide-react";
import Login from "./Login";
import { PageErrorBoundary } from "components/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-6">
              Explore Yourself
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Explore your interests, abilities, and skills to find the perfect
              career path.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <TestCard
              title="Interest Explorer"
              description="Explore your career interests using the RIASEC model to find occupations that match your preferences."
              icon={<Lightbulb />}
              testType="interest"
              available={true}
            />
            <TestCard
              title="Ability Explorer"
              description="explore on various capabilities to discover the area you'll fit well"
              icon={<Brain />}
              testType="ability"
              available={true}
              totalSections={4} // Total number of ability assessment sections
            />
            <TestCard
              title="Knowledge Explorer"
              description="explore your interest and natural attraction to various subjects and field of knowledge"
              icon={<GraduationCap />}
              testType="knowledge"
              available={true}
              totalSections={10} // Total number of knowledge assessment sections
            />
            <TestCard
              title="Skills Explorer"
              description="Explore the skills you're inspired to cultivate"
              icon={<Wrench />}
              testType="skills"
              available={true}
              totalSections={7}  // Total number of skill assessment sections
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();

  const handleStartTest = (testType: string) => {
    if (testType === "interest") {
      navigate(`/test/interest`);
    } else {
      navigate(`/${testType}selection`);
    }
  };

  const assessmentCards = [
    {
      title: "Interest Assessment",
      description: "Discover your passions and what truly motivates you.",
      testType: "interest",
    },
    {
      title: "Ability Assessment",
      description: "Understand your cognitive and practical abilities.",
      testType: "ability",
    },
    {
      title: "Skill Assessment",
      description:
        "Identify your strongest skills and areas for development.",
      testType: "skill",
    },
    {
      title: "Knowledge Assessment",
      description: "Test your knowledge in various academic and practical subjects.",
      testType: "knowledge",
    },
  ];

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PageErrorBoundary><Login /></PageErrorBoundary>} />
        <Route path="/" element={<PageErrorBoundary><Home /></PageErrorBoundary>} />
      </Routes>
    </AuthProvider>
  );
}
