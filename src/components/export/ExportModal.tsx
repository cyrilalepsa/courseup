import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Copy,
  FileText,
  Printer,
  Share2,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EcosystemBridge } from "@/components/ecosystem/EcosystemBridge";
import {
  buildQrPassPayload,
  buildShareText,
  canUseWebShare,
  copyShareText,
  copyQrPayload,
  downloadPdfRecap,
  downloadTextRecap,
  shareViaWebApi,
} from "@/services/exportService";
import type { ExportBundle, ExportResult } from "@/types/export";

type ExportTab = "share" | "qr" | "files" | "ecosystem";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  bundle: ExportBundle;
}

export function ExportModal({ open, onClose, bundle }: ExportModalProps) {
  const [tab, setTab] = useState<ExportTab>("share");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sharePreview = useMemo(() => buildShareText(bundle), [bundle]);
  const qrPayload = useMemo(() => buildQrPassPayload(bundle), [bundle]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const runAction = useCallback(
    async (action: () => Promise<ExportResult> | ExportResult) => {
      setError(null);
      setStatus(null);
      const result = await action();
      if (result.ok) {
        setStatus("done");
      } else {
        setError(result.error ?? "Action impossible");
      }
    },
    [],
  );

  const tabs: { id: ExportTab; label: string }[] = [
    { id: "share", label: "Partage" },
    { id: "qr", label: "QR Pass" },
    { id: "files", label: "Fichiers" },
    { id: "ecosystem", label: "Ponts" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            aria-label="Fermer"
            onClick={onClose}
          />

          <motion.div
            className="neria-card relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  Export CourseUp
                </p>
                <h2 id="export-modal-title" className="text-base font-bold text-slate-900">
                  Partage, QR &amp; fichiers
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Fermer la modale"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-2 py-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    tab === t.id ? "neria-tab-active" : "neria-tab-idle text-slate-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {tab === "share" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Texte formaté pour SMS, WhatsApp ou e-mail — total, économies et détail par
                    enseigne (Leclerc, Lidl, Aldi, drives…).
                  </p>
                  <textarea
                    readOnly
                    value={sharePreview}
                    rows={10}
                    className="neria-input w-full resize-none font-mono text-[11px] leading-relaxed"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void runAction(() => shareViaWebApi(bundle))}
                      className="neria-cta-primary inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm"
                    >
                      <Share2 className="h-4 w-4" />
                      {canUseWebShare() ? "Partager (Web Share API)" : "Copier (fallback)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void runAction(() => copyShareText(bundle))}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copier le texte
                    </button>
                  </div>
                </div>
              )}

              {tab === "qr" && (
                <div className="space-y-4 text-center">
                  <p className="text-xs text-slate-600">
                    Pass QR compact — validation caisse drive ou borne Selys (payload JSON signé
                    NeriaCorp).
                  </p>
                  <div className="mx-auto inline-block rounded-2xl border border-slate-200 bg-white p-4 shadow-inner">
                    <QRCodeSVG
                      value={qrPayload}
                      size={200}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#0041E6"
                    />
                  </div>
                  <p className="break-all font-mono text-[10px] text-slate-500">{qrPayload}</p>
                  <button
                    type="button"
                    onClick={() => void runAction(() => copyQrPayload(bundle))}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Copier le payload QR
                  </button>
                </div>
              )}

              {tab === "files" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Fiche récapitulative claire pour archivage ou impression.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const result = downloadTextRecap(bundle);
                      if (result.ok) setStatus("done");
                      else setError(result.error);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
                  >
                    <FileText className="h-4 w-4" />
                    Télécharger .txt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const result = downloadPdfRecap(bundle);
                      if (result.ok) setStatus("done");
                      else setError(result.error);
                    }}
                    className="neria-cta-primary flex w-full items-center justify-center gap-2 px-4 py-3 text-sm"
                  >
                    <FileText className="h-4 w-4" />
                    Télécharger .pdf
                  </button>
                </div>
              )}

              {tab === "ecosystem" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Passerelles inter-apps NeriaCorp — export deeplink vers les PWA partenaires.
                  </p>
                  <EcosystemBridge
                    showImport={false}
                    showExport
                    exportBundle={bundle}
                    items={bundle.items}
                    basket={bundle.basket}
                  />
                </div>
              )}

              {status === "done" && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <Check className="h-3.5 w-3.5" />
                  Action réussie
                </p>
              )}
              {error && (
                <p className="mt-3 text-xs font-medium text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
