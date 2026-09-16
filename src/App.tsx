import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { Header } from "@/components/layout/Header";
import { useCourseUp } from "@/context/CourseUpContext";
import { DispatchHub } from "@/features/dispatch/DispatchHub";
import { IngestionHub } from "@/features/ingestion/IngestionHub";
import { OptimizerHub } from "@/features/optimizer/OptimizerHub";
import type { OptimizedBasket } from "@/types/optimizer";

type AppStep = "ingestion" | "optimizer" | "dispatch";

const STEP_COPY: Record<
  AppStep,
  { sprint: string; step: string; title: string; description: string }
> = {
  ingestion: {
    sprint: "Sprint 3",
    step: "Étape 2",
    title: "CourseUp — Ingestion & export liste",
    description:
      "Scan, collage ou ponts écosystème — puis exportez la liste (partage, QR, fichiers) avant l'optimisation N2O.",
  },
  optimizer: {
    sprint: "Sprint 2",
    step: "Étape 2",
    title: "CourseUp — Optimiseur & magasins favoris",
    description:
      "Choisissez vos drives et commerces Selys à proximité. L'optimiseur affiche les points de retrait précis et la distance totale des trajets.",
  },
  dispatch: {
    sprint: "Sprint 3",
    step: "Étape 2",
    title: "CourseUp — Export, QR & passerelles NeriaCorp",
    description:
      "Partagez votre panier optimisé (Web Share, QR pass drive/Selys, fichiers TXT/PDF) et synchronisez Heritia & MamanDouce.",
  },
};

export default function App() {
  const { items, clearCart } = useCourseUp();
  const [step, setStep] = useState<AppStep>("ingestion");
  const [optimizedBasket, setOptimizedBasket] = useState<OptimizedBasket | null>(null);

  const handleOptimize = useCallback(() => {
    setStep("optimizer");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleProceedDispatch = useCallback((basket: OptimizedBasket) => {
    setOptimizedBasket(basket);
    setStep("dispatch");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    setStep("ingestion");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [clearCart]);

  const copy = STEP_COPY[step];

  return (
    <div className="neria-app-shell">
      <Header />

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
    </div>
  );
}
