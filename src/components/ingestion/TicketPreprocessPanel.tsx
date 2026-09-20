import { motion } from "framer-motion";
import { Contrast, Crop } from "lucide-react";
import { useCallback, useState } from "react";
import {
  loadImageBitmapFromFile,
  preprocessTicketImage,
  type TicketCropRect,
} from "@/services/ticketImagePipeline";

interface TicketPreprocessPanelProps {
  file: File;
  onReady: (dataUrl: string) => void;
  onCancel: () => void;
}

export function TicketPreprocessPanel({ file, onReady, onCancel }: TicketPreprocessPanelProps) {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [contrast, setContrast] = useState(1.35);
  const [cropMode, setCropMode] = useState(false);
  const [crop, setCrop] = useState<TicketCropRect | null>(null);
  const [busy, setBusy] = useState(false);

  const renderPreview = useCallback(async () => {
    setBusy(true);
    try {
      const dataUrl = await preprocessTicketImage(file, {
        contrastBoost: contrast,
        crop: crop ?? undefined,
      });
      setPreviewUrl(dataUrl);
    } finally {
      setBusy(false);
    }
  }, [contrast, crop, file]);

  const applyCenterCrop = useCallback(async () => {
    const bitmap = await loadImageBitmapFromFile(file);
    const marginX = Math.round(bitmap.width * 0.06);
    const marginY = Math.round(bitmap.height * 0.08);
    const nextCrop = {
      x: marginX,
      y: marginY,
      width: bitmap.width - marginX * 2,
      height: bitmap.height - marginY * 2,
    };
    bitmap.close();
    setCrop(nextCrop);
    setCropMode(true);
    setBusy(true);
    try {
      const dataUrl = await preprocessTicketImage(file, {
        contrastBoost: contrast,
        crop: nextCrop,
      });
      setPreviewUrl(dataUrl);
    } finally {
      setBusy(false);
    }
  }, [contrast, file]);

  return (
    <motion.div
      className="neria-card space-y-3 p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p className="text-sm font-semibold text-slate-900">Pré-traitement ticket</p>
      <p className="text-[11px] text-slate-600">
        Recadrage et binarisation pour optimiser l&apos;OCR N2 (JPG · PNG · WEBP · HEIC).
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        {previewUrl ? (
          <img src={previewUrl} alt="Aperçu ticket" className="max-h-56 w-full object-contain" />
        ) : (
          <div className="flex h-40 items-center justify-center text-xs text-slate-500">
            Génération de l&apos;aperçu…
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-[11px] text-slate-700">
        <Contrast className="h-3.5 w-3.5" />
        Contraste
        <input
          type="range"
          min={1}
          max={2}
          step={0.05}
          value={contrast}
          onChange={(e) => {
            setContrast(Number(e.target.value));
            void renderPreview();
          }}
          className="flex-1"
        />
      </label>

      {!previewUrl && (
        <button
          type="button"
          onClick={() => void renderPreview()}
          className="w-full rounded-xl border border-blue-200 bg-blue-50 py-2 text-[11px] font-semibold text-blue-900"
        >
          Générer l&apos;aperçu
        </button>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void applyCenterCrop()}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-800"
        >
          <Crop className="h-3.5 w-3.5" />
          Recadrer {cropMode ? "(actif)" : ""}
        </button>
        <button
          type="button"
          disabled={busy || !previewUrl}
          onClick={() => onReady(previewUrl)}
          className="neria-cta-primary flex-1 py-2 text-[11px]"
        >
          Valider l&apos;image
        </button>
      </div>

      <button type="button" onClick={onCancel} className="w-full text-[10px] text-slate-500">
        Annuler
      </button>
    </motion.div>
  );
}
