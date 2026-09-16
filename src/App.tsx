import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { IngestionHub } from "@/features/ingestion/IngestionHub";

export default function App() {
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
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
              <Sparkles className="h-5 w-5 text-emerald-accent" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-accent/90">
                Sprint 1 · Étape 1
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-white sm:text-xl">
                CourseUp v1.0 — Ingestion Intelligente
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                Importez tickets, texte ou listes depuis l&apos;écosystème NeriaCorp.
                Validez vos articles avant l&apos;optimisation multi-enseignes N2O.
              </p>
            </div>
          </div>
        </motion.div>

        <IngestionHub />
      </main>

      <footer className="relative border-t border-border/60 bg-navy/90 px-4 py-4 text-center backdrop-blur-md">
        <p className="text-[11px] text-slate-600">
          CourseUp · NeriaCorp · PWA offline-ready
        </p>
      </footer>
    </div>
  );
}
