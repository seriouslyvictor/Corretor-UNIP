"use client";

import { useState, useRef, useCallback } from "react";

// Dev-only logger — tree-shaken to nothing in production builds
const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") console.log("[corretor]", ...args);
};
import { parseHTML } from "@/lib/parser";
import type { ParsedQuestion } from "@/lib/schemas";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import {
  UploadSimple,
  Lightning,
  ChatText,
  Warning,
  CircleNotch,
} from "@phosphor-icons/react";

type Mode = "no-bs" | "verbose";
type PageState = "input" | "loading";

export default function Page() {
  const [pageState, setPageState] = useState<PageState>("input");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<Mode>("no-bs");
  const [pasteHTML, setPasteHTML] = useState("");
  const [uploadedHTML, setUploadedHTML] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "html" && ext !== "htm") {
      setError("Apenas arquivos .html são aceitos.");
      return;
    }
    setError(null);
    devLog(`Reading file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    const reader = new FileReader();
    reader.onload = (e) => {
      const html = e.target?.result as string;
      setUploadedHTML(html);
      setUploadedFileName(file.name);
      devLog(`File loaded: ${html.length} chars`);
    };
    reader.readAsText(file);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) readFile(file);
    },
    [readFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(true);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) readFile(file);
    },
    [readFile]
  );

  const handleSubmit = useCallback(async () => {
    const rawHTML = uploadedHTML || pasteHTML.trim();
    if (!rawHTML) {
      setError(
        "Nenhuma questão encontrada. Verifique se o HTML é da página de revisão da prova."
      );
      return;
    }
    devLog(`Parsing HTML (${rawHTML.length} chars)...`);
    const questions = parseHTML(rawHTML);
    devLog(`Parsed ${questions.length} questions:`, questions.map((q) => `Q${q.number} (${q.options.length} opts${q.imageBase64 ? ", img" : ""})`));
    if (questions.length === 0) {
      setError(
        "Nenhuma questão encontrada. Verifique se o HTML é da página de revisão da prova."
      );
      return;
    }
    setError(null);
    setParsedQuestions(questions);
    setIsSubmitting(true);
    setPageState("loading");
    devLog(`Entering loading state — mode: ${mode}, questions: ${questions.length}`);

    try {
      const response = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, questions }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error || `API error: ${response.status}`);
      }

      // Store the raw streaming response text for Phase 3 to consume
      // For now, read the full stream and parse the result
      const text = await response.text();
      devLog("API response:", text);

      // Phase 3 will implement progressive streaming UI.
      // For now, just log success and stay in loading state.
      // The gabarito page (Phase 3) will consume this data.
      devLog("Solve complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao resolver questões.";
      setError(message);
      setPageState("input");
      setIsSubmitting(false);
      devLog("API error:", err);
    }
  }, [uploadedHTML, pasteHTML, mode]);

  if (pageState === "loading") {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4">
        <CircleNotch className="animate-spin size-8 text-primary" />
        <p className="text-base font-medium">Analisando questões...</p>
        <p className="text-sm text-muted-foreground">
          {parsedQuestions.length} questões encontradas · Aguarde enquanto o Gemini resolve a prova.
        </p>
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
        {/* Upload Card */}
        <Card
          tabIndex={0}
          role="button"
          aria-label="Carregar arquivo HTML"
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
            "cursor-pointer transition-colors py-0 gap-0",
            isDragOver && "border-primary bg-primary/5"
          )}
        >
          <CardContent className="flex flex-col items-center gap-2 border-dashed border border-border rounded-4xl py-8">
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

        {/* OR separator */}
        <div className="relative flex items-center">
          <Separator className="flex-1" />
          <span className="px-3 text-xs text-muted-foreground">ou</span>
          <Separator className="flex-1" />
        </div>

        {/* Paste textarea */}
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

        {/* Mode selector */}
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

        {/* Submit */}
        <Button
          variant="default"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          Corrigir prova
        </Button>

        {/* Error message */}
        {error && (
          <p
            className="text-sm text-destructive flex items-center gap-1"
            role="alert"
          >
            <Warning size={16} /> {error}
          </p>
        )}
      </div>
    </main>
  );
}
