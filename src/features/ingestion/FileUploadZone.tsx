import { motion, AnimatePresence } from "framer-motion";
import { Camera, FileText, UploadCloud } from "lucide-react";
import { useCallback, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import type { IngestedItem } from "@/types/ingestion";
import { MOCK_FILE_ITEMS } from "./mockIngestion";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.csv,application/pdf,image/png,image/jpeg,text/csv";

interface FileUploadZoneProps {
  onItemsExtracted: (items: IngestedItem[]) => void;
}

type Phase = "idle" | "scanning" | "done";

export function FileUploadZone({ onItemsExtracted }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState<string | null>(null);

  const runScan = useCallback(
    (name: string) => {
      setFileName(name);
      setPhase("scanning");
      window.setTimeout(() => {
        setPhase("done");
        onItemsExtracted(MOCK_FILE_ITEMS);
        window.setTimeout(() => setPhase("idle"), 1200);
      }, 2200);
    },
    [onItemsExtracted],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length || phase === "scanning") return;
      runScan(files[0].name);
    },
    [phase, runScan],
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className="space-y-3">
      <motion.div
        role="button"
        tabIndex={0}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onClick={() => phase !== "scanning" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative overflow-hidden rounded-2xl border border-dashed p-8 text-center transition-colors ${
          isDragging
            ? "border-emerald-accent/70 bg-emerald-500/10"
            : "border-border bg-card/50 backdrop-blur-md hover:border-slate-500"
        } ${phase === "scanning" ? "pointer-events-none" : "cursor-pointer"}`}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <AnimatePresence mode="wait">
          {phase === "scanning" ? (
            <motion.div
              key="scan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex min-h-[140px] flex-col items-center justify-center gap-3"
            >
              <div className="relative h-24 w-full max-w-xs overflow-hidden rounded-lg border border-border bg-navy/80">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(16,185,129,0.08)_50%,transparent_100%)]" />
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-accent to-transparent shadow-[0_0_12px_2px_rgba(16,185,129,0.8)]"
                  initial={{ top: "0%" }}
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                />
                <Camera className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-slate-600" />
              </div>
              <p className="text-sm font-medium text-emerald-300">
                Scan OCR en cours…
              </p>
              {fileName && (
                <p className="max-w-full truncate text-xs text-slate-500">{fileName}</p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="drop"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-navy/50">
                <UploadCloud className="h-7 w-7 text-emerald-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  Glissez un ticket, une recette ou un fichier
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  PDF, PNG, JPG, CSV — ou touchez pour parcourir
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5">
                  <Camera className="h-3 w-3" /> Photo ticket
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5">
                  <FileText className="h-3 w-3" /> Export CSV
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === "done" && (
          <motion.p
            className="mt-4 text-xs font-medium text-emerald-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {MOCK_FILE_ITEMS.length} ingrédients extraits
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
