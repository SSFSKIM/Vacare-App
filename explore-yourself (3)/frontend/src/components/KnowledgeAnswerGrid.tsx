import React from "react";
import { Button } from "@/components/ui/button";

interface Props {
  questionId: number;
  currentAnswer: number | undefined;
  onAnswerChange: (questionId: number, value: number) => void;
}

export const KnowledgeAnswerGrid: React.FC<Props> = ({ questionId, currentAnswer, onAnswerChange }) => {
  const answerValues = [
    [0, 10, 20, 30, 40],
    [50, 60, 70, 80, 90, 100] // Adjusted to include 0 and go up to 100 as per task (0-100 means 11 values)
                                 // Let's stick to 10 buttons, 0-100 in steps of 10
  ];

  const firstRowValues = [0, 10, 20, 30, 40];
  const secondRowValues = [50, 60, 70, 80, 90, 100]; // This makes 11, task says 10 boxes. Adjusting to 0-90 for 10, or 0-100 means 11.
                                                    // Task states: "10 selectable boxes (representing values 0-100)"
                                                    // This implies values like 0, 10, 20, ..., 90 OR 10, 20, ..., 100. Let's use 0-90 for 10 boxes or clarify.
                                                    // User example says "0, 10, 20, ..., 100". This is 11 values if 0 is a box.
                                                    // Okay, "10 selectable boxes ... 0, 10, ..., 100." This is a contradiction.
                                                    // The original code in KnowledgeTest.tsx had 10, 20, ..., 100 (10 boxes)
                                                    // Let's use 10, 20, 30, 40, 50 and 60, 70, 80, 90, 100 as in KnowledgeTest.tsx for 10 boxes total.

  const finalFirstRow = [10, 20, 30, 40, 50];
  const finalSecondRow = [60, 70, 80, 90, 100];

  return (
    <div className="space-y-2">
      {/* First row */}
      <div className="grid grid-cols-5 gap-2">
        {finalFirstRow.map((value) => (
          <Button
            key={value}
            variant={currentAnswer === value ? "default" : "outline"}
            onClick={() => onAnswerChange(questionId, value)}
            className="p-2 h-auto flex flex-col gap-1 text-sm"
            size="sm"
          >
            <span>{value}</span>
            {/* {value === 10 && <span className="text-xs font-normal">Not at all</span>} */}
            {/* {value === 30 && <span className="text-xs font-normal">Slightly</span>} */}
            {/* {value === 50 && <span className="text-xs font-normal">Moderately</span>} */}
          </Button>
        ))}
      </div>
      
      {/* Second row */}
      <div className="grid grid-cols-5 gap-2">
        {finalSecondRow.map((value) => (
          <Button
            key={value}
            variant={currentAnswer === value ? "default" : "outline"}
            onClick={() => onAnswerChange(questionId, value)}
            className="p-2 h-auto flex flex-col gap-1 text-sm"
            size="sm"
          >
            <span>{value}</span>
            {/* {value === 70 && <span className="text-xs font-normal">Considerably</span>} */}
            {/* {value === 100 && <span className="text-xs font-normal">Extremely</span>} */}
          </Button>
        ))}
      </div>
    </div>
  );
};
