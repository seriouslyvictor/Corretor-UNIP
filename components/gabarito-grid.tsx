"use client";

import { useState } from "react";
import type { ParsedQuestion, SolvedAnswer, SolveError } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Warning, ArrowCounterClockwise, Copy, Check } from "@phosphor-icons/react";

interface GabaritoGridProps {
  parsedQuestions: ParsedQuestion[];
  solvedAnswers: SolvedAnswer[];
  failedQuestions: SolveError[];
  isStreaming: boolean;
  onRetry: (questionIndex: number) => void;
}

export function GabaritoGrid({
  parsedQuestions,
  solvedAnswers,
  failedQuestions,
  isStreaming,
  onRetry,
}: GabaritoGridProps) {
  const [selectedError, setSelectedError] = useState<SolveError | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedQuestion = selectedError != null
    ? parsedQuestions[selectedError.questionIndex]
    : null;

  function handleCopy() {
    if (!selectedQuestion) return;
    const text = [
      selectedQuestion.text,
      ...selectedQuestion.options.map((o) => `${o.letter}) ${o.text}`),
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleRetry() {
    if (!selectedError) return;
    onRetry(selectedError.questionIndex);
    setSelectedError(null);
  }

  const errorCount = failedQuestions.length;
  const answersMap = new Map(solvedAnswers.map((a) => [a.questionIndex, a]));
  const errorsMap = new Map(failedQuestions.map((e) => [e.questionIndex, e]));

  return (
    <>
      <div>
        <p className="text-sm font-medium mb-3">
          Gabarito ({solvedAnswers.length}/{parsedQuestions.length}
          {errorCount > 0 && (
            <span className="text-destructive ml-1">· {errorCount} erro{errorCount > 1 ? "s" : ""}</span>
          )}
          )
        </p>
        <div className="grid grid-cols-5 gap-2">
          {parsedQuestions.map((_, i) => {
            const sa = answersMap.get(i);
            const err = errorsMap.get(i);

            if (sa) {
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

            if (err) {
              return (
                <button
                  key={i}
                  onClick={() => setSelectedError(err)}
                  className="flex flex-col items-center rounded-md bg-destructive/10 border border-destructive/30 p-2 cursor-pointer hover:bg-destructive/20 transition-colors"
                  title={err.message}
                >
                  <span className="text-xs text-destructive/70">{i + 1}</span>
                  <Warning weight="fill" className="size-4 text-destructive" />
                </button>
              );
            }

            if (isStreaming) {
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

      <Sheet open={selectedError != null} onOpenChange={(open) => !open && setSelectedError(null)}>
        <SheetContent side="bottom" className="max-h-[80svh] overflow-y-auto">
          {selectedError && selectedQuestion && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-destructive flex items-center gap-2">
                  <Warning weight="fill" className="size-5" />
                  Questão {selectedError.questionIndex + 1} — sem resposta
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-4">
                <div className="text-sm text-muted-foreground rounded-md bg-muted p-3 space-y-2">
                  <p>{selectedQuestion.text}</p>
                  <ul className="space-y-1">
                    {selectedQuestion.options.map((o) => (
                      <li key={o.letter} className="flex gap-2">
                        <span className="font-semibold shrink-0">{o.letter})</span>
                        <span>{o.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-xs text-muted-foreground">{selectedError.message}</p>

                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" onClick={handleRetry}>
                    <ArrowCounterClockwise className="size-4" />
                    Tentar novamente
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleCopy}>
                    {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                    {copied ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
