"use client";

import { useState } from "react";
import { parseHTML } from "@/lib/parser";
import type { ParsedQuestion, SolvedAnswer, SolveError } from "@/lib/schemas";
import { solvedAnswerSchema, solveErrorSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Lightning, ChatText, Warning, CircleNotch, ArrowLeft, Code, Camera } from "@phosphor-icons/react";
import { PhotoScanTab, type QueuedImage } from "@/components/photo-scan-tab";
import { GabaritoGrid } from "@/components/gabarito-grid";
import { QuestionCard } from "@/components/question-card";

type Mode = "no-bs" | "verbose";
type PageState = "input" | "results";
type InputTab = "html" | "photo";

export default function Page() {
  const [pageState, setPageState] = useState<PageState>("input");
  const [mode, setMode] = useState<Mode>("no-bs");
  const [tab, setTab] = useState<InputTab>("html");
  const [pasteHTML, setPasteHTML] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [solvedAnswers, setSolvedAnswers] = useState<SolvedAnswer[]>([]);
  const [failedQuestions, setFailedQuestions] = useState<SolveError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  function handleReset() {
    setPageState("input");
    setParsedQuestions([]);
    setSolvedAnswers([]);
    setFailedQuestions([]);
    setError(null);
    setIsLoading(false);
    setRateLimitMessage(null);
  }

  async function handleRetry(questionIndex: number) {
    const question = parsedQuestions[questionIndex];
    if (!question) return;

    // Optimistically remove from failed so the cell goes back to "missed" while retrying
    setFailedQuestions((prev) => prev.filter((e) => e.questionIndex !== questionIndex));

    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: [question], mode }),
      });
      if (!res.ok || !res.body) throw new Error(`${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const raw = JSON.parse(trimmed);
            if (raw.__type === "status") continue;
            if (raw.__error === true) {
              // retry failed — restore with original questionIndex
              setFailedQuestions((prev) => [...prev, { ...solveErrorSchema.parse(raw), questionIndex }]);
              continue;
            }
            // remap index 0 (from single-question POST) back to original
            const parsed = solvedAnswerSchema.parse(raw);
            setSolvedAnswers((prev) => [...prev, { ...parsed, questionIndex }]);
          } catch {
            // skip malformed
          }
        }
      }
    } catch {
      // restore error if request itself failed
      setFailedQuestions((prev) => [
        ...prev,
        { questionIndex, __error: true as const, message: "Não foi possível obter resposta." },
      ]);
    }
  }

  async function handleSubmit() {
    const rawHTML = pasteHTML.trim();
    if (!rawHTML) {
      setError("Nenhuma questão encontrada. Verifique se o HTML é da página de revisão da prova.");
      return;
    }
    const questions = parseHTML(rawHTML);
    if (questions.length === 0) {
      setError("Nenhuma questão encontrada. Verifique se o HTML é da página de revisão da prova.");
      return;
    }
    setError(null);
    setParsedQuestions(questions);
    setSolvedAnswers([]);
    setPageState("results");
    setIsLoading(true);

    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, mode }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Erro na API: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const raw = JSON.parse(trimmed);
            if (raw.__type === "status") {
              setRateLimitMessage(raw.message);
              continue;
            }
            if (raw.__error === true) {
              const err = solveErrorSchema.parse(raw);
              setFailedQuestions((prev) => [...prev, err]);
              continue;
            }
            const parsed = solvedAnswerSchema.parse(raw);
            setSolvedAnswers((prev) => [...prev, parsed]);
          } catch {
            // skip malformed lines
          }
        }
      }

      // flush remaining buffer
      if (buffer.trim()) {
        try {
          const raw = JSON.parse(buffer.trim());
          if (raw.__error === true) {
            setFailedQuestions((prev) => [...prev, solveErrorSchema.parse(raw)]);
          } else {
            setSolvedAnswers((prev) => [...prev, solvedAnswerSchema.parse(raw)]);
          }
        } catch {
          // skip
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido. Tente novamente.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  }

  if (pageState === "results") {
    return (
      <main className="flex min-h-svh flex-col items-center px-4 py-12 gap-6">
        <header className="text-center">
          <h1 className="font-heading text-2xl font-semibold">Corretor UNIP</h1>
          {isLoading && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <CircleNotch className="animate-spin size-4" />
              {rateLimitMessage ?? "Analisando questões..."}
            </p>
          )}
          {!isLoading && !error && (
            <p className="text-sm text-muted-foreground mt-1">
              Prova corrigida!
            </p>
          )}
        </header>

        <div className="w-full max-w-lg flex flex-col gap-4">
          {error && (
            <div
              className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-2"
              role="alert"
            >
              <Warning size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{error}</p>
                <p className="text-destructive/80 mt-1">Verifique sua conexão e tente novamente.</p>
              </div>
            </div>
          )}

          <GabaritoGrid
            parsedQuestions={parsedQuestions}
            solvedAnswers={solvedAnswers}
            failedQuestions={failedQuestions}
            isStreaming={isLoading}
            onRetry={handleRetry}
          />

          {mode === "verbose" && solvedAnswers.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Explicações</p>
              {solvedAnswers
                .slice()
                .sort((a, b) => a.questionIndex - b.questionIndex)
                .map((sa) => (
                  <QuestionCard
                    key={sa.questionIndex}
                    questionNumber={sa.questionIndex + 1}
                    answer={sa.answer}
                    confidence={sa.confidence}
                    explanation={sa.explanation ?? "Sem explicação disponível."}
                  />
                ))}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleReset}
          >
            <ArrowLeft size={16} /> Nova prova
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-12 gap-8">
      <header className="text-center">
        <h1 className="font-heading text-2xl font-semibold">Corretor UNIP</h1>
        <p className="text-base text-muted-foreground">
          Cole o HTML da revisão de prova abaixo.
        </p>
      </header>

      <div className="w-full max-w-lg flex flex-col gap-6">
        {/* Tab toggle */}
        <div className="border border-border rounded-lg p-1 flex gap-1">
          <Button
            variant={tab === "html" ? "default" : "ghost"}
            className="flex-1 gap-1"
            aria-pressed={tab === "html"}
            onClick={() => setTab("html")}
          >
            <Code size={16} /> HTML
          </Button>
          <Button
            variant={tab === "photo" ? "default" : "ghost"}
            className="flex-1 gap-1"
            aria-pressed={tab === "photo"}
            onClick={() => setTab("photo")}
          >
            <Camera size={16} /> Foto
          </Button>
        </div>

        {/* Tab content */}
        {tab === "html" ? (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="paste-html">Código-fonte HTML</Label>
              <Textarea
                id="paste-html"
                className="min-h-[160px] font-mono text-sm"
                placeholder="Cole o HTML aqui..."
                value={pasteHTML}
                onChange={(e) => setPasteHTML(e.target.value)}
              />
            </div>

            <div className="border border-border rounded-lg p-1 flex gap-1">
              <Button
                variant={mode === "no-bs" ? "default" : "outline"}
                className="flex-1 gap-1"
                aria-pressed={mode === "no-bs"}
                onClick={() => setMode("no-bs")}
              >
                <Lightning size={16} /> No BS
              </Button>
              <Button
                variant={mode === "verbose" ? "default" : "outline"}
                className="flex-1 gap-1"
                aria-pressed={mode === "verbose"}
                onClick={() => setMode("verbose")}
              >
                <ChatText size={16} /> Verbose
              </Button>
            </div>

            <Button
              variant="default"
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              Corrigir prova
            </Button>
          </>
        ) : (
          <PhotoScanTab
            onExtract={(images: QueuedImage[]) => {
              console.log("extract requested", images.length);
            }}
          />
        )}

        {error && (
          <p className="text-sm text-destructive flex items-center gap-1" role="alert">
            <Warning size={16} /> {error}
          </p>
        )}
      </div>
    </main>
  );
}
