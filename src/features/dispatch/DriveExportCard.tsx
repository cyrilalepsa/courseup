import { motion } from "framer-motion";
import { ExternalLink, Loader2, ShoppingBag, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { DispatchStatus, DriveCheckoutLink } from "@/types/dispatch";

interface DriveExportCardProps {
  checkout: DriveCheckoutLink;
  index: number;
  onStatusChange: (id: string, status: DispatchStatus) => void;
}

export function DriveExportCard({ checkout, index, onStatusChange }: DriveExportCardProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (isExporting || checkout.status === "completed") return;
    setIsExporting(true);
    onStatusChange(checkout.id, "exported");

    window.setTimeout(() => {
      onStatusChange(checkout.id, "checkout_started");
      window.open(checkout.deeplinkUrl, "_blank", "noopener,noreferrer");
      setIsExporting(false);
    }, 900);
  };

  const markComplete = () => {
    onStatusChange(checkout.id, "completed");
  };

  const ratePct = Math.round(checkout.affiliationRate * 100);
  const statusLabel =
    checkout.status === "completed"
      ? "Panier validé"
      : checkout.status === "checkout_started"
        ? "Checkout ouvert"
        : checkout.status === "exported"
          ? "Panier transféré"
          : "En attente d'export";

  return (
    <motion.article
      className="overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-md"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-navy/30 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Drive {index + 1}
          </p>
          <h3 className="text-sm font-bold text-white">{checkout.storeName}</h3>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-300/90">
            <ShieldCheck className="h-3.5 w-3.5" />
            Token affiliation {checkout.affiliationToken} · {ratePct}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">{checkout.subtotal.toFixed(2)} €</p>
          <p className="text-[10px] text-slate-500">{statusLabel}</p>
        </div>
      </div>

      <ul className="max-h-40 divide-y divide-border/60 overflow-y-auto px-4 py-1">
        {checkout.items.map((line) => (
          <li
            key={line.itemId}
            className="flex items-center justify-between gap-2 py-2 text-sm"
          >
            <span className="text-slate-200">
              {line.name}{" "}
              <span className="text-slate-500">
                × {line.quantity} {line.unit}
              </span>
            </span>
            <span className="shrink-0 text-slate-400">{line.lineTotal.toFixed(2)} €</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t border-border p-4 sm:flex-row">
        <motion.button
          type="button"
          disabled={isExporting || checkout.status === "completed"}
          onClick={handleExport}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-accent px-4 py-2.5 text-sm font-bold text-navy transition hover:brightness-110 disabled:opacity-50"
          whileTap={{ scale: 0.98 }}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Transfert…
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              Exporter le panier (deeplink)
            </>
          )}
        </motion.button>
        {checkout.status === "checkout_started" && (
          <button
            type="button"
            onClick={markComplete}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300"
          >
            <ExternalLink className="h-4 w-4" />
            J&apos;ai finalisé ce drive
          </button>
        )}
      </div>
    </motion.article>
  );
}
