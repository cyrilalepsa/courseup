import { motion, AnimatePresence } from "framer-motion";
import { FileText, UploadCloud } from "lucide-react";
import { useCallback, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { parseUploadedFile } from "@/services/ocrService";
import type { IngestedItem } from "@/types/ingestion";

const ACCEPT =
  ".pdf,.txt,.csv,.png,.jpg,.jpeg,application/pdf,text/plain,text/csv,image/png,image/jpeg";

interface FileUploadZoneProps {
  onItemsExtracted: (items: IngestedItem[]) => void;
}

type Phase = "idle" | "processing" | "done" | "error";

export function FileUploadZone({ onItemsExtracted }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastCount, setLastCount] = useState(0);

  const processFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setPhase("processing");
      setProgress(0);
      setError(null);
      try {
        const items = await parseUploadedFile(file, (p, label) => {
          setProgress(Math.round(p * 100));
          setStatus(label);
        });
        if (items.length === 0) {
          setPhase("error");
          setError("Aucun article détecté dans ce fichier.");
          return;
        }
        setLastCount(items.length);
        onItemsExtracted(items);
        setPhase("done");
        window.setTimeout(() => setPhase("idle"), 1400);
      } catch {
        setPhase("error");
        setError("Import impossible — format PDF/TXT/CSV ou image ticket requis.");
      }
    },
    [onItemsExtracted],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length || phase === "processing") return;
      void processFile(files[0]);
    },
    [phase, processFile],
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
        onClick={() => phase !== "processing" && inputRef.current?.click()}
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
        } ${phase === "processing" ? "pointer-events-none" : "cursor-pointer"}`}
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
          {phase === "processing" ? (
            <motion.div
              key="proc"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[120px] flex-col items-center justify-center gap-3"
            >
              <UploadCloud className="h-10 w-10 animate-pulse text-emerald-accent" />
              <p className="text-sm font-medium text-emerald-300">{status || "Import…"}</p>
              {fileName && (
                <p className="max-w-full truncate text-xs text-slate-500">{fileName}</p>
              )}
              <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-navy/60">
                <div
                  className="h-full bg-emerald-accent transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
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
                <FileText className="h-7 w-7 text-emerald-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Import fichier</p>
                <p className="mt-1 text-xs text-slate-500">PDF · TXT · CSV (+ OCR image ticket)</p>
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
            {lastCount} articles extraits
          </motion.p>
        )}
        {error && <p className="mt-3 text-xs text-amber-300">{error}</p>}
      </motion.div>
    </div>
  );
}
