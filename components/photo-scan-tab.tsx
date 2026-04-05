"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ArrowRight, X, Warning } from "@phosphor-icons/react";

export interface QueuedImage {
  id: string;
  file: File;
  previewUrl: string;
}

export interface PhotoScanTabProps {
  onExtract?: (images: QueuedImage[]) => void;
}

export function PhotoScanTab({ onExtract }: PhotoScanTabProps) {
  const [images, setImages] = useState<QueuedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup: revoke all object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const valid: QueuedImage[] = [];
    let hasInvalid = false;
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        hasInvalid = true;
        continue;
      }
      valid.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (hasInvalid) {
      setError("Apenas imagens são aceitas (JPG, PNG, HEIC).");
    } else if (valid.length > 0) {
      setError(null);
    }

    if (valid.length > 0) {
      setImages((prev) => [...prev, ...valid]);
    }

    // Reset input so re-selecting the same file fires onChange
    e.target.value = "";
  }

  function handleRemove(id: string) {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  }

  function handleExtractClick() {
    onExtract?.(images);
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-2"
          role="alert"
        >
          <Warning size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((img) => (
            <Card key={img.id}>
              <CardContent className="p-0 relative overflow-hidden aspect-square">
                <img
                  src={img.previewUrl}
                  alt=""
                  className="object-cover w-full h-full"
                />
                <button
                  type="button"
                  aria-label="Remover imagem"
                  onClick={() => handleRemove(img.id)}
                  className="absolute top-1 right-1 p-2.5 bg-background/80 rounded-full hover:bg-background transition-colors"
                >
                  <X size={24} />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => fileInputRef.current?.click()}
      >
        <Plus size={16} /> Adicionar imagem
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      <Button
        variant="default"
        size="lg"
        className="w-full gap-2"
        disabled={images.length === 0}
        onClick={handleExtractClick}
      >
        Extrair Questões <ArrowRight size={16} />
      </Button>
    </div>
  );
}
