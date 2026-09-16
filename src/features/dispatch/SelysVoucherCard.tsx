import { motion } from "framer-motion";
import { Leaf, QrCode, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import type { DispatchStatus, SelysVoucher } from "@/types/dispatch";

interface SelysVoucherCardProps {
  voucher: SelysVoucher;
  onStatusChange: (id: string, status: DispatchStatus) => void;
}

export function SelysVoucherCard({ voucher, onStatusChange }: SelysVoucherCardProps) {
  const [generated, setGenerated] = useState(voucher.status !== "pending");

  const generatePass = () => {
    onStatusChange(voucher.id, "exported");
    window.setTimeout(() => {
      onStatusChange(voucher.id, "checkout_started");
      setGenerated(true);
    }, 700);
  };

  const confirmPickup = () => {
    onStatusChange(voucher.id, "completed");
  };

  return (
    <motion.article
      className="neria-card overflow-hidden border border-cyan-200/60"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="border-b border-slate-200 bg-gradient-to-r from-cyan-50 to-violet-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-bold text-slate-900">Bon de commande Selys</p>
            <p className="text-[11px] text-slate-600">{voucher.merchantHub}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-violet-700">
          <Sparkles className="mr-1 inline h-3.5 w-3.5" />
          {voucher.n2oApplied} N2O appliqués sur ce retrait local
        </p>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr]">
        <div className="mx-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-inner">
          {generated ? (
            <QRCodeSVG
              value={voucher.qrPayload}
              size={148}
              level="M"
              bgColor="#ffffff"
              fgColor="#0041E6"
            />
          ) : (
            <div className="flex h-[148px] w-[148px] flex-col items-center justify-center gap-2 bg-slate-100 text-slate-500">
              <QrCode className="h-10 w-10 opacity-40" />
              <span className="text-[10px] font-medium">Pass à générer</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-600">Code retrait</p>
            <p className="font-mono text-lg font-bold tracking-wider text-slate-900">
              {voucher.passCode}
            </p>
            <p className="text-xs text-slate-600">{voucher.pickupWindow}</p>
          </div>
          <ul className="max-h-28 space-y-1 overflow-y-auto text-xs text-slate-700">
            {voucher.items.map((line) => (
              <li key={line.itemId}>
                {line.name} · {line.quantity} {line.unit}
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold text-slate-900">
            Total Selys : {voucher.subtotal.toFixed(2)} €
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-200 p-4 sm:flex-row">
        {!generated ? (
          <motion.button
            type="button"
            onClick={generatePass}
            className="neria-cta-primary inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm"
            whileTap={{ scale: 0.98 }}
          >
            <QrCode className="h-4 w-4" />
            Générer le pass QR
          </motion.button>
        ) : (
          voucher.status !== "completed" && (
            <button
              type="button"
              onClick={confirmPickup}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800"
            >
              Confirmer le retrait Selys
            </button>
          )
        )}
      </div>
    </motion.article>
  );
}
