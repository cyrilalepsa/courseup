import { motion } from "framer-motion";
import { Gift, History, Medal, Sparkles, X } from "lucide-react";
import { useMemo } from "react";
import {
  BADGE_DEFINITIONS,
  isBadgeUnlocked,
} from "@/services/badgeService";
import { getCashbackConfig } from "@/services/cashbackService";
import { SELYS_MERCHANT_REWARDS } from "@/config/merchantRewards";
import type { CashbackLedgerEntry } from "@/types/cashback";
import type { GamificationBadgeRecord } from "@/types/gamification";

interface N2ODashboardProps {
  open: boolean;
  onClose: () => void;
  n2oBalance: number;
  ledger: CashbackLedgerEntry[];
  badges: GamificationBadgeRecord[];
  onRedeemReward: (rewardId: string) => void;
  redeemError: string | null;
}

export function N2ODashboard({
  open,
  onClose,
  n2oBalance,
  ledger,
  badges,
  onRedeemReward,
  redeemError,
}: N2ODashboardProps) {
  const config = getCashbackConfig();
  const totals = useMemo(() => {
    const savingsEuro = ledger.reduce((s, e) => s + e.savingsEuro, 0);
    const tokens = ledger.reduce((s, e) => s + e.tokensGranted, 0);
    return { savingsEuro, tokens };
  }, [ledger]);

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[55] flex items-end justify-center p-0 sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="n2o-dashboard-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
        aria-label="Fermer"
        onClick={onClose}
      />

      <motion.div
        className="neria-card relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden sm:rounded-2xl"
        initial={{ y: 40 }}
        animate={{ y: 0 }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
              Cashback N2O
            </p>
            <h2 id="n2o-dashboard-title" className="text-lg font-bold text-slate-900">
              Tableau de bord N2O
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Ratio configurable · {config.eurosPerN2OToken} € d&apos;économie = 1 jeton
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-[10px] uppercase text-slate-600">Solde N2O</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xl font-bold text-violet-700">
                <Sparkles className="h-4 w-4" />
                {n2oBalance.toLocaleString("fr-FR")}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <p className="text-[10px] uppercase text-slate-600">Historique crédité</p>
              <p className="mt-1 text-sm font-semibold text-blue-700">
                {totals.savingsEuro.toFixed(2)} € → +{totals.tokens} N2O
              </p>
            </div>
          </div>

          <section className="mt-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <History className="h-4 w-4 text-slate-500" />
              Économies & jetons
            </h3>
            {ledger.length === 0 ? (
              <p className="text-xs text-slate-500">Aucun crédit enregistré pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-2">
                {ledger.slice(0, 12).map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-800">
                        {entry.label ?? entry.source}
                      </p>
                      <p className="text-slate-500">
                        {new Date(entry.createdAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-700">{entry.savingsEuro.toFixed(2)} €</p>
                      <p className="text-violet-700">+{entry.tokensGranted} N2O</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Gift className="h-4 w-4 text-emerald-600" />
              Privilèges & Cadeaux Artisans Selys
            </h3>
            {redeemError && (
              <p className="mb-2 text-xs font-medium text-rose-600">{redeemError}</p>
            )}
            <ul className="space-y-2">
              {SELYS_MERCHANT_REWARDS.map((reward) => {
                const affordable = n2oBalance >= reward.n2oCost;
                return (
                  <li key={reward.id} className="neria-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] uppercase text-emerald-700">
                          {reward.merchantName}
                        </p>
                        <p className="font-semibold text-slate-900">{reward.title}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{reward.description}</p>
                      </div>
                      <span className="neria-badge-n2o shrink-0 text-[10px]">
                        {reward.n2oCost} N2O
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={!affordable}
                      onClick={() => onRedeemReward(reward.id)}
                      className="neria-cta-n2o mt-3 w-full disabled:opacity-40"
                    >
                      Échanger contre jetons
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mt-6">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Medal className="h-4 w-4 text-amber-500" />
              Badges gamification
            </h3>
            <div className="flex flex-wrap gap-2">
              {BADGE_DEFINITIONS.map((def) => {
                const unlocked = isBadgeUnlocked(badges, def.id);
                return (
                  <span
                    key={def.id}
                    className={`neria-badge ${def.cssClass} ${unlocked ? "" : "opacity-40"}`}
                    title={def.description}
                  >
                    {def.label}
                    {!unlocked && " · verrouillé"}
                  </span>
                );
              })}
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}
