import { motion, AnimatePresence } from "framer-motion";
import { Camera, ScanLine } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { recognizeReceiptImage } from "@/services/ocrService";
import type { IngestedItem } from "@/types/ingestion";

interface TicketScanZoneProps {
  onItemsExtracted: (items: IngestedItem[]) => void;
}

type Phase = "idle" | "scanning" | "done" | "error";

export function TicketScanZone({ onItemsExtracted }: TicketScanZoneProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastCount, setLastCount] = useState(0);

  const runOcr = useCallback(
    async (file: File) => {
      setPhase("scanning");
      setProgress(0);
      setError(null);
      try {
        const { items } = await recognizeReceiptImage(file, (p, label) => {
          setProgress(Math.round(p * 100));
          setStatus(label);
        });
        if (items.length === 0) {
          setPhase("error");
          setError("Aucune ligne reconnue — réessayez avec une photo plus nette.");
          return;
        }
        setLastCount(items.length);
        onItemsExtracted(items);
        setPhase("done");
        window.setTimeout(() => setPhase("idle"), 1500);
      } catch {
        setPhase("error");
        setError("Échec OCR — vérifiez la photo ou utilisez le collage texte.");
      }
    },
    [onItemsExtracted],
  );

  const onPick = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file || phase === "scanning") return;
      void runOcr(file);
    },
    [phase, runOcr],
  );

  return (
    <div className="space-y-3">
      <motion.div
        className="rounded-2xl border border-border bg-card/50 p-5 backdrop-blur-md"
        whileTap={{ scale: phase === "scanning" ? 1 : 0.995 }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
            <Camera className="h-7 w-7 text-emerald-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Photo / Scanner ticket</p>
            <p className="mt-1 text-xs text-slate-500">
              OCR client-side (Tesseract) · pré-traitement contraste smartphone
            </p>
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPick(e.target.files)}
          />

          <button
            type="button"
            disabled={phase === "scanning"}
            onClick={() => cameraRef.current?.click()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-accent px-4 py-3 text-sm font-bold text-navy disabled:opacity-50"
          >
            <ScanLine className="h-4 w-4" />
            Ouvrir la caméra / galerie
          </button>

          <AnimatePresence mode="wait">
            {phase === "scanning" && (
              <motion.div
                key="progress"
                className="w-full space-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="relative h-24 overflow-hidden rounded-lg border border-border bg-navy/80">
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 bg-emerald-accent shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                    animate={{ top: ["5%", "95%", "5%"] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-navy/60">
                  <motion.div
                    className="h-full bg-emerald-accent"
                    animate={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-emerald-300">
                  {status || "Numérisation…"} {progress}%
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {phase === "done" && (
            <p className="text-xs font-medium text-emerald-400">
              {lastCount} article{lastCount > 1 ? "s" : ""} injectés (confiance OCR)
            </p>
          )}
          {error && <p className="text-xs text-amber-300">{error}</p>}
        </div>
      </motion.div>
    </div>
  );
}
