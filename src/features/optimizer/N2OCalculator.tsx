import { motion } from "framer-motion";
import { Coins, Sparkles } from "lucide-react";
import type { N2OGain } from "@/types/optimizer";

interface N2OCalculatorProps {
  gain: N2OGain;
}

export function N2OCalculator({ gain }: N2OCalculatorProps) {
  const percent = Math.round(gain.conversionProgress * 100);

  return (
    <motion.section
      className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-card/80 to-emerald-950/20 p-4 backdrop-blur-md sm:p-5"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-accent/90">
            Mécanique N2O
          </p>
          <h3 className="mt-1 flex items-center gap-2 text-lg font-bold text-white">
            <Sparkles className="h-5 w-5 text-emerald-accent" />+{gain.pointsEarned} N2O
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Cashback affiliation estimé :{" "}
            <span className="font-semibold text-emerald-300">{gain.cashbackEuro.toFixed(2)} €</span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">{gain.bonusLabel}</p>
        </div>
        <div className="rounded-xl border border-border bg-navy/50 px-3 py-2 text-right">
          <p className="text-[10px] uppercase text-slate-500">Palier</p>
          <p className="text-sm font-semibold text-emerald-300">{gain.tierLabel}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Conversion solde N2O</span>
          <span className="font-semibold text-emerald-300">{percent}%</span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full border border-border bg-navy/60">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)] opacity-60" />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
          <Coins className="h-3 w-3 text-amber-400/80" />
          Prochain unlock dispatch premium à 600 N2O cumulés sur la commande
        </div>
      </div>
    </motion.section>
  );
}
