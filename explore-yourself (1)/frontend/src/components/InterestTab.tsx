import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface InterestData {
  name: 'R' | 'I' | 'A' | 'S' | 'E' | 'C';
  score: number;
}

interface InterestTabProps {
  data: InterestData[];
}

const riasecDescriptions = {
  R: {
    title: 'Realistic (Doers)',
    description: 'Practical, hands-on problems and solutions. They enjoy working with plants, animals, and real-world materials like wood, tools, and machinery.',
  },
  I: {
    title: 'Investigative (Thinkers)',
    description: 'Working with ideas and theories. They enjoy solving complex problems and are often drawn to science and research.',
  },
  A: {
    title: 'Artistic (Creators)',
    description: 'Creative expression and working with forms, designs, and patterns. They appreciate self-expression and aesthetics.',
  },
  S: {
    title: 'Social (Helpers)',
    description: 'Working with, communicating with, and teaching people. They enjoy helping and providing service to others.',
  },
  E: {
    title: 'Enterprising (Persuaders)',
    description: 'Starting up and carrying out projects, especially business ventures. They enjoy leading people and making decisions.',
  },
  C: {
    title: 'Conventional (Organizers)',
    description: 'Following procedures and maintaining records. They prefer working with data and details more than with ideas.',
  },
};

export const InterestTab: React.FC<InterestTabProps> = ({ data }) => {
  const navigate = useNavigate();

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Interest Results</CardTitle>
          <CardDescription>Complete the interest assessment to see your profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/assessment?test=interest')}>Take Interest Test</Button>
        </CardContent>
      </Card>
    );
  }

  // Ensure data is sorted in RIASEC order for consistent display
  const sortedData = [...data].sort((a, b) => {
    const order = ['R', 'I', 'A', 'S', 'E', 'C'];
    return order.indexOf(a.name) - order.indexOf(b.name);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedData.map((item) => {
          const details = riasecDescriptions[item.name];
          const scorePercentage = item.score * 20; // Assuming score is 0-5, converting to 0-100

          return (
            <Card key={item.name}>
              <CardHeader>
                <CardTitle className="text-lg">{details.title}</CardTitle>
                <CardDescription>{details.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-sm font-medium">Your Score</h4>
                  <span className="text-sm font-semibold">{scorePercentage}%</span>
                </div>
                <Progress value={scorePercentage} className="h-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>
       <div className="text-center mt-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/assessment?test=interest')}
          >
            Retake Interest Test
          </Button>
        </div>
    </div>
  );
};
