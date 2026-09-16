import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { Header } from "@/components/layout/Header";
import { DispatchHub } from "@/features/dispatch/DispatchHub";
import { IngestionHub } from "@/features/ingestion/IngestionHub";
import { OptimizerHub } from "@/features/optimizer/OptimizerHub";
import type { IngestedItem } from "@/types/ingestion";
import type { OptimizedBasket } from "@/types/optimizer";

type AppStep = "ingestion" | "optimizer" | "dispatch";

const STEP_COPY: Record<
  AppStep,
  { step: string; title: string; description: string }
> = {
  ingestion: {
    step: "Étape 1",
    title: "CourseUp v1.0 — Ingestion Intelligente",
    description:
      "Importez tickets, texte ou listes depuis l'écosystème NeriaCorp. Validez vos articles avant l'optimisation multi-enseignes N2O.",
  },
  optimizer: {
    step: "Étape 2",
    title: "CourseUp v1.0 — Optimiseur Multi-Enseignes N2O",
    description:
      "Dispatch algorithmique Carrefour, Leclerc, Auchan et circuits Selys — cashback affiliation et conversion N2O en temps réel.",
  },
  dispatch: {
    step: "Étape 3",
    title: "CourseUp v1.0 — Hub de Dispatch",
    description:
      "Export des paniers vers les drives affiliés, génération des bons Selys et crédit N2O — suivez chaque checkout jusqu'à la validation.",
  },
};

export default function App() {
  const [step, setStep] = useState<AppStep>("ingestion");
  const [validatedItems, setValidatedItems] = useState<IngestedItem[]>([]);
  const [optimizedBasket, setOptimizedBasket] = useState<OptimizedBasket | null>(null);

  const handleOptimize = useCallback((items: IngestedItem[]) => {
    setValidatedItems(items);
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
    setValidatedItems([]);
    setOptimizedBasket(null);
    setStep("ingestion");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const copy = STEP_COPY[step];

  return (
    <div className="flex min-h-dvh flex-col bg-navy">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-24 bottom-1/3 h-72 w-72 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <Header />

      <main className="relative mx-auto w-full max-w-3xl flex-1 px-4 pb-8 pt-5">
        <motion.div
          className="mb-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card/80 to-navy/40 p-4 backdrop-blur-md sm:p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          layout
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
              <Sparkles className="h-5 w-5 text-emerald-accent" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-accent/90">
                Sprint 1 · {copy.step}
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-white sm:text-xl">{copy.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{copy.description}</p>
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
                items={validatedItems}
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

      <footer className="relative border-t border-border/60 bg-navy/90 px-4 py-4 text-center backdrop-blur-md">
        <p className="text-[11px] text-slate-600">
          CourseUp · NeriaCorp · PWA offline-ready
        </p>
      </footer>
    </div>
  );
}
