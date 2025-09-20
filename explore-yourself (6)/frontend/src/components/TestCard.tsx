import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useFirebaseAssessmentStore } from '../utils/firebase-assessment-store';
import { useCurrentUser } from 'app';

interface TestCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  testType: string;
  available?: boolean;
  totalSections?: number;
}

export function TestCard({ title, description, icon, testType, available = false, totalSections = 0 }: TestCardProps) {
  const navigate = useNavigate();
  const { assessment, isLoading } = useFirebaseAssessmentStore();
  const { user } = useCurrentUser();
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedSections, setCompletedSections] = useState(0);

  useEffect(() => {
    if (!assessment || isLoading) {
      return;
    }

    let isComplete = false;
    let completedCount = 0;

    // This logic is for the main 'Explorer' cards on the home page
    if (totalSections > 0 && !testType.includes('-')) {
      if (testType === 'ability' && assessment.ability?.results) {
        completedCount = new Set(assessment.ability.results.map(r => r.subset)).size;
        isComplete = completedCount === totalSections;
      } else if (testType === 'knowledge' && assessment.knowledge?.results) {
        completedCount = new Set(assessment.knowledge.results.map(r => r.subset)).size;
        isComplete = completedCount === totalSections;
      } else if (testType === 'skills' && assessment.skills?.results) {
        completedCount = new Set(assessment.skills.results.map(r => r.subset)).size;
        isComplete = completedCount === totalSections;
      }
    }
    // This logic is for the sub-test cards on the selection pages
    else {
      if (testType.endsWith('-ability') && assessment.ability?.results) {
        isComplete = assessment.ability.results.some(r => r.subset?.toLowerCase() === testType.toLowerCase());
      } else if (testType.endsWith('-knowledge') && assessment.knowledge?.results) {
        isComplete = assessment.knowledge.results.some(r => r.subset?.toLowerCase() === testType.toLowerCase());
      } else if (testType.endsWith('-skill') && assessment.skills?.results) {
        isComplete = assessment.skills.results.some(r => r.subset?.toLowerCase() === testType.toLowerCase());
      }
    }
    
    // This logic is for the interest assessment
    if (testType === 'interest' && assessment.interest?.results?.length > 0) {
        isComplete = true;
    }

    setCompletedSections(completedCount);
    setIsCompleted(isComplete);

  }, [assessment, isLoading, testType, totalSections]);

  const handleClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (isCompleted && testType === 'interest') {
      // Allow retaking the interest test
      navigate('/assessment?type=interest');
      return;
    }

    if (isCompleted && !testType.includes('-')) {
      // Navigate to the main results page with a hash for the section
      if (testType === 'ability') {
        navigate('/results#ability');
        return;
      } else if (testType === 'knowledge') {
        navigate('/results#knowledge');
        return;
      } else if (testType === 'skills') {
        navigate('/results#skills');
        return;
      } else if (testType === 'interest') {
        navigate('/results#interest');
        return;
      }
    }

    if (!available) return;
    
    switch (testType) {
      case "ability":
        navigate("/ability-selection");
        break;
      case "cognitive-ability":
        navigate("/cognitive-ability-test");
        break;
      case "physical-ability":
        navigate("/physical-ability-test");
        break;
      case "psychomotor-ability":
        navigate("/psychomotor-ability-test");
        break;
      case "sensory-ability":
        navigate("/sensory-ability-test");
        break;
      case "knowledge":
        navigate("/knowledge-selection");
        break;
      case "arts-humanities-knowledge":
        navigate("/arts-humanities-knowledge-test");
        break;
      case "business-management-knowledge":
        navigate("/business-management-knowledge-test");
        break;
      case "communications-knowledge":
        navigate("/communications-knowledge-test");
        break;
      case "education-training-knowledge":
        navigate("/education-training-knowledge-test");
        break;
      case "engineering-technology-knowledge":
        navigate("/engineering-technology-knowledge-test");
        break;
      case "health-services-knowledge":
        navigate("/health-services-knowledge-test");
        break;
      case "law-safety-knowledge":
        navigate("/law-safety-knowledge-test");
        break;
      case "manufacturing-production-knowledge":
        navigate("/manufacturing-production-knowledge-test");
        break;
      case "math-science-knowledge":
        navigate("/math-science-knowledge-test");
        break;
      case "transportation-knowledge":
        navigate("/transportation-knowledge-test");
        break;
      case "skills":
        navigate("/skill-selection");
        break;
      default:
        navigate(`/assessment?type=${testType}`);
    }
  };

  return (
    <Card className={`p-6 flex flex-col h-full relative ${isLoading ? 'opacity-70' : ''} ${isCompleted ? 'bg-accent border-l-4 border-primary' : ''}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      {isCompleted && (
        <div className="absolute top-2 right-2 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </div>
      )}
      <div className="flex justify-between items-start mb-4">
        <div className="text-4xl text-primary">{icon}</div>
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6 flex-grow">{description}</p>
      {totalSections > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>{completedSections} of {totalSections} sections completed</span>
            <span>{Math.round((completedSections / totalSections) * 100)}%</span>
          </div>
          <Progress value={(completedSections / totalSections) * 100} className="h-2" />
        </div>
      )}
      <Button 
        onClick={handleClick}
        className="w-full"
        disabled={!available}
      >
        {isCompleted ? (testType === 'interest' || testType.includes('-') ? 'Retake Test' : 'View Results') : available ? 'Start Test' : 'Coming Soon'}
      </Button>
    </Card>
  );
}
