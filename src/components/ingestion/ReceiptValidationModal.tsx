import { AnimatePresence, motion } from "framer-motion";
import { ShoppingCart, X } from "lucide-react";
import { useCallback, useState } from "react";
import type { MatchedReceiptLine } from "@/services/receiptProductMatcher";
import { createIngestedItem } from "@/features/ingestion/mockIngestion";
import type { IngestedItem } from "@/types/ingestion";
import type { N2ReceiptOcrResponse } from "@shared/n2ReceiptOcr";

interface ReceiptValidationModalProps {
  open: boolean;
  receipt: N2ReceiptOcrResponse | null;
  lines: MatchedReceiptLine[];
  onClose: () => void;
  onInject: (items: IngestedItem[]) => void;
}

export function ReceiptValidationModal({
  open,
  receipt,
  lines: initialLines,
  onClose,
  onInject,
}: ReceiptValidationModalProps) {
  const [lines, setLines] = useState(initialLines);

  const updateLine = useCallback(
    (index: number, patch: Partial<MatchedReceiptLine>) => {
      setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    },
    [],
  );

  const handleInject = useCallback(() => {
    const items = lines.map((line) =>
      createIngestedItem(
        {
          name: line.matchedName,
          quantity: line.quantity,
          unit: "u",
          category: line.category,
          confidenceScore: Math.max(0.55, line.matchScore),
        },
        "ocr",
      ),
    );
    onInject(items);
    onClose();
  }, [lines, onClose, onInject]);

  return (
    <AnimatePresence>
      {open && receipt && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/45 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="neria-profile-glass max-h-[85dvh] w-full max-w-lg overflow-hidden rounded-3xl"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/20 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Validation ticket OCR</p>
                <p className="text-[10px] text-slate-600">
                  {receipt.merchant_name ?? "Enseigne"} ·{" "}
                  {receipt.date_time ?? "Date inconnue"} · Total{" "}
                  {receipt.total_amount != null ? `${receipt.total_amount.toFixed(2)} €` : "—"}
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Fermer">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <ul className="max-h-[50dvh] space-y-2 overflow-y-auto p-4">
              {lines.map((line, index) => (
                <li
                  key={`${line.rawLabel}-${index}`}
                  className="rounded-xl border border-white/30 bg-white/55 p-2.5 backdrop-blur-sm"
                >
                  <p className="text-[10px] text-slate-500">OCR : {line.rawLabel}</p>
                  <input
                    className="neria-input mt-1 w-full px-2 py-1 text-xs"
                    value={line.matchedName}
                    onChange={(e) => updateLine(index, { matchedName: e.target.value })}
                  />
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <label className="text-[10px] text-slate-600">
                      Qté
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        className="neria-input mt-0.5 w-full px-1 py-1 text-xs"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(index, { quantity: Number(e.target.value) || 1 })
                        }
                      />
                    </label>
                    <label className="text-[10px] text-slate-600">
                      P.U.
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="neria-input mt-0.5 w-full px-1 py-1 text-xs"
                        value={line.unitPrice ?? ""}
                        onChange={(e) =>
                          updateLine(index, {
                            unitPrice: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </label>
                    <label className="text-[10px] text-slate-600">
                      Match
                      <p className="mt-1 text-xs font-semibold text-violet-700">
                        {(line.matchScore * 100).toFixed(0)} %
                      </p>
                    </label>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-white/20 p-4">
              <button
                type="button"
                onClick={handleInject}
                className="neria-cta-n2o flex w-full items-center justify-center gap-2 py-2.5 text-sm"
              >
                <ShoppingCart className="h-4 w-4" />
                Injecter dans le panier / liste
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
