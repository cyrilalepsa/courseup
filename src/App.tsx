import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { CheckoutPassModal } from "@/components/checkout/CheckoutPassModal";
import { N2ODashboard } from "@/components/dashboard/N2ODashboard";
import { Header } from "@/components/layout/Header";
import { InStoreMode } from "@/components/instore/InStoreMode";
import { useCourseUp } from "@/context/CourseUpContext";
import { DispatchHub } from "@/features/dispatch/DispatchHub";
import { IngestionHub } from "@/features/ingestion/IngestionHub";
import { OptimizerHub } from "@/features/optimizer/OptimizerHub";
import { createExportBundle } from "@/services/exportService";
import type { OptimizedBasket } from "@/types/optimizer";

type AppStep = "ingestion" | "optimizer" | "dispatch";

const STEP_COPY: Record<
  AppStep,
  { sprint: string; step: string; title: string; description: string }
> = {
  ingestion: {
    sprint: "Sprint 4",
    step: "Étape 1",
    title: "CourseUp — Ingestion & Nutri-Score",
    description:
      "Saisie directe ou import : auto-complétion, tags régimes à la volée, badges Nutri A→F et préparation du parcours macro-rayons.",
  },
  optimizer: {
    sprint: "Sprint 4",
    step: "Étape 2",
    title: "CourseUp — Optimiseur, Pass Caisse & Cashback N2O",
    description:
      "Filtres nutrition, panier optimisé, Pass Caisse (QR + fidélité) et crédit N2O selon vos économies réelles.",
  },
  dispatch: {
    sprint: "Sprint 4",
    step: "Étape 3",
    title: "CourseUp — Selys Marketplace, Dashboard N2O & Badges",
    description:
      "Dispatch multi-enseignes, redirection Selys Click & Collect, tableau N2O, rewards artisans et sync Heritia.",
  },
};

export default function App() {
  const {
    items,
    clearCart,
    n2oBalance,
    cashbackLedger,
    gamificationBadges,
    checkoutWallet,
    redeemMerchantReward,
  } = useCourseUp();
  const [step, setStep] = useState<AppStep>("ingestion");
  const [optimizedBasket, setOptimizedBasket] = useState<OptimizedBasket | null>(null);
  const [inStoreOpen, setInStoreOpen] = useState(false);
  const [checkoutPassOpen, setCheckoutPassOpen] = useState(false);
  const [n2oDashboardOpen, setN2oDashboardOpen] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const checkoutBundle = useMemo(() => {
    if (!optimizedBasket) return null;
    return createExportBundle(
      step === "dispatch" ? "dispatch" : "optimizer",
      items,
      optimizedBasket,
    );
  }, [items, optimizedBasket, step]);

  const handleOptimize = useCallback(() => {
    setStep("optimizer");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBasketReady = useCallback((basket: OptimizedBasket) => {
    setOptimizedBasket(basket);
  }, []);

  const handleProceedDispatch = useCallback((basket: OptimizedBasket) => {
    setOptimizedBasket(basket);
    setStep("dispatch");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleStartInStore = useCallback((basket: OptimizedBasket) => {
    setOptimizedBasket(basket);
    setInStoreOpen(true);
  }, []);

  const handleBackToIngestion = useCallback(() => {
    setStep("ingestion");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBackToOptimizer = useCallback(() => {
    setStep("optimizer");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleNewOrder = useCallback(() => {
    clearCart();
    setOptimizedBasket(null);
    setInStoreOpen(false);
    setStep("ingestion");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [clearCart]);

  const copy = STEP_COPY[step];
  const canStartInStore =
    !!optimizedBasket && items.length > 0 && (step === "optimizer" || step === "dispatch");
  const canOpenCheckoutPass = !!optimizedBasket && items.length > 0;

  const handleRedeemReward = useCallback(
    (rewardId: string) => {
      setRedeemError(null);
      const ok = redeemMerchantReward(rewardId);
      if (!ok) setRedeemError("Solde N2O insuffisant pour cet échange.");
    },
    [redeemMerchantReward],
  );

  return (
    <div className="neria-app-shell">
      <Header
        shoppingReady={canStartInStore}
        checkoutPassReady={canOpenCheckoutPass}
        onOpenCheckoutPass={
          canOpenCheckoutPass ? () => setCheckoutPassOpen(true) : undefined
        }
        onOpenN2ODashboard={() => setN2oDashboardOpen(true)}
        onStartInStore={
          canStartInStore && optimizedBasket
            ? () => handleStartInStore(optimizedBasket)
            : undefined
        }
      />

      <main className="relative mx-auto w-full max-w-3xl flex-1 px-4 pb-8 pt-5">
        <motion.div
          className="neria-card mb-6 overflow-hidden p-4 sm:p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          layout
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#22D3EE_0%,#A855F7_100%)] shadow-md">
              <Sparkles className="h-5 w-5 text-slate-900" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                {copy.sprint} · {copy.step}
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900 sm:text-xl">{copy.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{copy.description}</p>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === "ingestion" && (
            <motion.div
              key="ingestion"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <IngestionHub onOptimize={handleOptimize} />
            </motion.div>
          )}
          {step === "optimizer" && (
            <motion.div
              key="optimizer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <OptimizerHub
                items={items}
                onBack={handleBackToIngestion}
                onProceedToDispatch={handleProceedDispatch}
                onBasketReady={handleBasketReady}
                onStartInStore={handleStartInStore}
              />
            </motion.div>
          )}
          {step === "dispatch" && optimizedBasket && (
            <motion.div
              key="dispatch"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <DispatchHub
                basket={optimizedBasket}
                onBack={handleBackToOptimizer}
                onNewOrder={handleNewOrder}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative border-t border-white/10 px-4 py-4 text-center backdrop-blur-md">
        <p className="text-[11px] text-slate-300/80">
          CourseUp · NeriaCorp · PWA offline-ready
        </p>
      </footer>

      <AnimatePresence>
        {inStoreOpen && optimizedBasket && (
          <InStoreMode
            items={items}
            basket={optimizedBasket}
            onClose={() => setInStoreOpen(false)}
            onOpenCheckoutPass={() => setCheckoutPassOpen(true)}
          />
        )}
      </AnimatePresence>

      {optimizedBasket && checkoutBundle && (
        <CheckoutPassModal
          open={checkoutPassOpen}
          onClose={() => setCheckoutPassOpen(false)}
          items={items}
          basket={optimizedBasket}
          wallet={checkoutWallet}
        />
      )}

      <N2ODashboard
        open={n2oDashboardOpen}
        onClose={() => setN2oDashboardOpen(false)}
        n2oBalance={n2oBalance}
        ledger={cashbackLedger}
        badges={gamificationBadges}
        onRedeemReward={handleRedeemReward}
        redeemError={redeemError}
      />
    </div>
  );
}
