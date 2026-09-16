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
      className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-card/90 to-emerald-950/25 backdrop-blur-md"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="border-b border-emerald-500/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-emerald-accent" />
          <div>
            <p className="text-sm font-bold text-white">Bon de commande Selys</p>
            <p className="text-[11px] text-slate-400">{voucher.merchantHub}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-emerald-300/90">
          <Sparkles className="mr-1 inline h-3.5 w-3.5" />
          {voucher.n2oApplied} N2O appliqués sur ce retrait local
        </p>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr]">
        <div className="mx-auto rounded-2xl border border-border bg-white p-3 shadow-inner">
          {generated ? (
            <QRCodeSVG
              value={voucher.qrPayload}
              size={148}
              level="M"
              bgColor="#ffffff"
              fgColor="#0A192F"
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
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Code retrait</p>
            <p className="font-mono text-lg font-bold tracking-wider text-white">
              {voucher.passCode}
            </p>
            <p className="text-xs text-slate-400">{voucher.pickupWindow}</p>
          </div>
          <ul className="max-h-28 space-y-1 overflow-y-auto text-xs text-slate-300">
            {voucher.items.map((line) => (
              <li key={line.itemId}>
                {line.name} · {line.quantity} {line.unit}
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold text-white">
            Total Selys : {voucher.subtotal.toFixed(2)} €
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-emerald-500/20 p-4 sm:flex-row">
        {!generated ? (
          <motion.button
            type="button"
            onClick={generatePass}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-accent px-4 py-2.5 text-sm font-bold text-navy"
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
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-300"
            >
              Confirmer le retrait Selys
            </button>
          )
        )}
      </div>
    </motion.article>
  );
}
