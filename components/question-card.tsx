"use client"

import { cn } from "@/lib/utils"

interface QuestionCardProps {
  questionNumber: number
  answer: string
  confidence: "high" | "medium" | "low"
  explanation: string
}

export function QuestionCard({ questionNumber, answer, confidence, explanation }: QuestionCardProps) {
  return (
    <details className="group rounded-lg border border-border">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden list-none">
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">Questão {questionNumber}</span>
          <span
            className={cn(
              "font-heading font-semibold",
              confidence === "high" && "text-primary",
              confidence === "medium" && "text-muted-foreground",
              confidence === "low" && "text-amber-500",
            )}
          >
            {answer}
          </span>
        </span>
        <span className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true">
          &#9662;
        </span>
      </summary>
      <div className="border-t border-border px-4 py-3 text-sm text-foreground/90 leading-relaxed">
        {explanation}
      </div>
    </details>
  )
}
