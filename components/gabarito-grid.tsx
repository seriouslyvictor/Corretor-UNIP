"use client";

import type { ParsedQuestion, SolvedAnswer } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface GabaritoGridProps {
  parsedQuestions: ParsedQuestion[];
  solvedAnswers: SolvedAnswer[];
  isStreaming: boolean;
}

export function GabaritoGrid({
  parsedQuestions,
  solvedAnswers,
  isStreaming,
}: GabaritoGridProps) {
  return (
    <div>
      <p className="text-sm font-medium mb-3">
        Gabarito ({solvedAnswers.length}/{parsedQuestions.length})
      </p>
      <div className="grid grid-cols-5 gap-2">
        {parsedQuestions.map((_, i) => {
          const sa = solvedAnswers.find((a) => a.questionIndex === i);

          if (sa) {
            // Filled cell
            return (
              <div
                key={i}
                className="flex flex-col items-center rounded-md bg-muted p-2"
              >
                <span className="text-xs text-muted-foreground">{i + 1}</span>
                <span
                  className={cn(
                    "font-heading font-semibold",
                    sa.confidence === "high" && "text-primary",
                    sa.confidence === "medium" && "text-muted-foreground",
                    sa.confidence === "low" && "text-amber-500",
                  )}
                >
                  {sa.answer}
                </span>
              </div>
            );
          }

          if (isStreaming) {
            // Skeleton cell (per D-04)
            return (
              <div
                key={i}
                className="flex flex-col items-center rounded-md bg-muted p-2"
              >
                <span className="text-xs text-muted-foreground">{i + 1}</span>
                <span className="h-5 w-4 animate-pulse rounded bg-muted-foreground/20" />
              </div>
            );
          }

          // Missed cell — stream finished but no answer arrived for this index
          return (
            <div
              key={i}
              className="flex flex-col items-center rounded-md bg-muted p-2"
            >
              <span className="text-xs text-muted-foreground">{i + 1}</span>
              <span className="font-heading font-semibold text-muted-foreground">
                -
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
