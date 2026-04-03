"use client";

import { useState, useRef } from "react";
import { parseHTML } from "@/lib/parser";
import type { ParsedQuestion, SolvedAnswer } from "@/lib/schemas";
import { SolvedAnswerSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { UploadSimple, Lightning, ChatText, Warning, CircleNotch } from "@phosphor-icons/react";

type Mode = "no-bs" | "verbose";
type PageState = "input" | "loading";

export default function Page() {
  const [pageState, setPageState] = useState<PageState>("input");
  const [mode, setMode] = useState<Mode>("no-bs");
  const [pasteHTML, setPasteHTML] = useState("");
  const [uploadedHTML, setUploadedHTML] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [solvedAnswers, setSolvedAnswers] = useState<SolvedAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function readFile(file: File) {
    if (!file.name.endsWith(".html") && !file.name.endsWith(".htm")) {
      setError("Apenas arquivos .html são aceitos.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedHTML(e.target?.result as string);
      setUploadedFileName(file.name);
      setError(null);
    };
    reader.readAsText(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  async function handleSubmit() {
    const rawHTML = uploadedHTML || pasteHTML.trim();
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
    setPageState("loading");
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
            const parsed = SolvedAnswerSchema.parse(JSON.parse(trimmed));
            setSolvedAnswers((prev) => [...prev, parsed]);
          } catch {
            // skip malformed lines
          }
        }
      }

      // flush remaining buffer
      if (buffer.trim()) {
        try {
          const parsed = SolvedAnswerSchema.parse(JSON.parse(buffer.trim()));
          setSolvedAnswers((prev) => [...prev, parsed]);
        } catch {
          // skip
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido. Tente novamente.");
      setPageState("input");
      setIsLoading(false);
      return;
    }

    setPageState("input");
    setIsLoading(false);
  }

  if (pageState === "loading") {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4">
        <CircleNotch className="animate-spin size-8 text-primary" />
        <p className="text-base font-medium">Analisando questões...</p>
        <p className="text-sm text-muted-foreground">Aguarde enquanto o Gemini resolve a prova.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-12 gap-8">
      <header className="text-center">
        <h1 className="font-heading text-2xl font-semibold">Corretor UNIP</h1>
        <p className="text-base text-muted-foreground">
          Cole o HTML da revisão de prova ou carregue o arquivo salvo.
        </p>
      </header>

      <div className="w-full max-w-lg flex flex-col gap-6">
        <Card
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "cursor-pointer transition-colors",
            isDragOver && "border-primary bg-primary/5",
          )}
        >
          <CardContent className="flex flex-col items-center gap-2 border-dashed border-border py-8">
            <UploadSimple className="size-8 text-muted-foreground" />
            {uploadedFileName ? (
              <p className="text-sm text-muted-foreground">{uploadedFileName}</p>
            ) : (
              <>
                <p className="text-sm font-semibold">Carregar arquivo</p>
                <p className="text-sm text-muted-foreground text-center">
                  Arraste o .html aqui ou clique para escolher
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              className="hidden"
              onChange={handleFileChange}
            />
          </CardContent>
        </Card>

        <div className="relative flex items-center">
          <Separator className="flex-1" />
          <span className="px-3 text-xs text-muted-foreground">ou</span>
          <Separator className="flex-1" />
        </div>

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

        {error && (
          <p className="text-sm text-destructive flex items-center gap-1" role="alert">
            <Warning size={16} /> {error}
          </p>
        )}

        {solvedAnswers.length > 0 && (
          <div className="border border-border rounded-lg p-4">
            <p className="text-sm font-medium mb-2">
              Gabarito ({solvedAnswers.length}/{parsedQuestions.length})
            </p>
            <div className="grid grid-cols-5 gap-2">
              {solvedAnswers.map((sa) => (
                <div
                  key={sa.questionIndex}
                  className="flex flex-col items-center rounded bg-muted p-2"
                >
                  <span className="text-xs text-muted-foreground">{sa.questionIndex + 1}</span>
                  <span className="font-heading font-semibold text-primary">{sa.answer}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
