import { motion, AnimatePresence } from "framer-motion";
import { Camera, ScanLine } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { ReceiptValidationModal } from "@/components/ingestion/ReceiptValidationModal";
import { TicketPreprocessPanel } from "@/components/ingestion/TicketPreprocessPanel";
import { recognizeReceiptImage } from "@/services/ocrService";
import { matchReceiptLines } from "@/services/receiptProductMatcher";
import { TICKET_IMAGE_ACCEPT } from "@/services/ticketImagePipeline";
import type { IngestedItem } from "@/types/ingestion";
import type { N2ReceiptOcrResponse } from "@shared/n2ReceiptOcr";

interface TicketScanZoneProps {
  onItemsExtracted: (items: IngestedItem[]) => void;
}

type Phase = "idle" | "preprocess" | "scanning" | "validate" | "done" | "error";

export function TicketScanZone({ onItemsExtracted }: TicketScanZoneProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastCount, setLastCount] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<N2ReceiptOcrResponse | null>(null);
  const [matchedLines, setMatchedLines] = useState(
    () => [] as ReturnType<typeof matchReceiptLines>,
  );

  const runOcr = useCallback(
    async (file: File, processedDataUrl?: string) => {
      setPhase("scanning");
      setProgress(0);
      setError(null);
      try {
        const result = await recognizeReceiptImage(
          file,
          (p, label) => {
            setProgress(Math.round(p * 100));
            setStatus(label);
          },
          processedDataUrl,
        );
        if (result.receipt.items.length === 0) {
          setPhase("error");
          setError("Aucune ligne reconnue — réessayez avec une photo plus nette.");
          return;
        }
        setReceipt(result.receipt);
        setMatchedLines(matchReceiptLines(result.receipt.items));
        setPhase("validate");
      } catch {
        setPhase("error");
        setError("Échec OCR — vérifiez la photo ou utilisez le collage texte.");
      }
    },
    [],
  );

  const onPick = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file || phase === "scanning") return;
      setPendingFile(file);
      setPhase("preprocess");
    },
    [phase],
  );

  const handleInject = useCallback(
    (items: IngestedItem[]) => {
      setLastCount(items.length);
      onItemsExtracted(items);
      setPhase("done");
      window.setTimeout(() => setPhase("idle"), 1500);
    },
    [onItemsExtracted],
  );

  return (
    <div className="space-y-3">
      {phase === "preprocess" && pendingFile && (
        <TicketPreprocessPanel
          file={pendingFile}
          onCancel={() => {
            setPendingFile(null);
            setPhase("idle");
          }}
          onReady={(dataUrl) => {
            void runOcr(pendingFile, dataUrl);
          }}
        />
      )}

      {phase !== "preprocess" && (
        <motion.div className="neria-card p-5" whileTap={{ scale: phase === "scanning" ? 1 : 0.995 }}>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50">
              <Camera className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Photo / Scanner ticket</p>
              <p className="mt-1 text-xs text-slate-600">
                Ingress N2 <code className="text-[10px]">/api/ocr/receipt</code> · JPG PNG WEBP HEIC
              </p>
            </div>

            <input
              ref={cameraRef}
              type="file"
              accept={TICKET_IMAGE_ACCEPT}
              capture="environment"
              className="hidden"
              onChange={(e) => onPick(e.target.files)}
            />
            <input
              ref={fileRef}
              type="file"
              accept={TICKET_IMAGE_ACCEPT}
              className="hidden"
              onChange={(e) => onPick(e.target.files)}
            />

            <div className="grid w-full grid-cols-2 gap-2">
              <button
                type="button"
                disabled={phase === "scanning"}
                onClick={() => cameraRef.current?.click()}
                className="neria-cta-primary inline-flex items-center justify-center gap-2 px-3 py-3 text-xs disabled:opacity-50"
              >
                <ScanLine className="h-4 w-4" />
                Caméra
              </button>
              <button
                type="button"
                disabled={phase === "scanning"}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-xs font-semibold text-slate-800 disabled:opacity-50"
              >
                Fichier
              </button>
            </div>

            <AnimatePresence mode="wait">
              {phase === "scanning" && (
                <motion.div
                  key="progress"
                  className="w-full space-y-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <motion.div
                      className="h-full bg-blue-600"
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-700">
                    {status || "Numérisation…"} {progress}%
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {phase === "done" && (
              <p className="text-xs font-medium text-blue-700">
                {lastCount} article{lastCount > 1 ? "s" : ""} injectés
              </p>
            )}
            {error && <p className="text-xs text-amber-700">{error}</p>}
          </div>
        </motion.div>
      )}

      {phase === "validate" && receipt && (
        <ReceiptValidationModal
          key={`${receipt.merchant_name ?? "ticket"}-${receipt.items.length}`}
          open
          receipt={receipt}
          lines={matchedLines}
          onClose={() => setPhase("idle")}
          onInject={handleInject}
        />
      )}
    </div>
  );
}
