import { motion } from "framer-motion";
import { FileUp, Link2, Type } from "lucide-react";
import { useCallback, useState } from "react";
import type { IngestedItem, IngestionSource } from "@/types/ingestion";
import { EcosystemBridge } from "./EcosystemBridge";
import { FileUploadZone } from "./FileUploadZone";
import { parseTextToItems } from "./mockIngestion";
import { ParsedItemsPreview } from "./ParsedItemsPreview";

type TabId = IngestionSource;

const tabs: { id: TabId; label: string; icon: typeof FileUp }[] = [
  { id: "file", label: "Scan / Fichier", icon: FileUp },
  { id: "text", label: "Collage Texte", icon: Type },
  { id: "bridge", label: "Ponts Écosystème", icon: Link2 },
];

interface IngestionHubProps {
  onOptimize: (items: IngestedItem[]) => void;
}

export function IngestionHub({ onOptimize }: IngestionHubProps) {
  const [activeTab, setActiveTab] = useState<TabId>("file");
  const [items, setItems] = useState<IngestedItem[]>([]);
  const [textValue, setTextValue] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const mergeItems = useCallback((incoming: IngestedItem[]) => {
    setItems((prev) => {
      const byName = new Map(prev.map((i) => [i.name.toLowerCase(), i]));
      for (const item of incoming) {
        byName.set(item.name.toLowerCase(), item);
      }
      return Array.from(byName.values());
    });
  }, []);

  const replaceItems = useCallback((incoming: IngestedItem[]) => {
    setItems(incoming);
  }, []);

  const handleAnalyzeText = useCallback(() => {
    setIsAnalyzing(true);
    window.setTimeout(() => {
      const parsed = parseTextToItems(textValue);
      replaceItems(parsed);
      setIsAnalyzing(false);
    }, 900);
  }, [textValue, replaceItems]);

  return (
    <section className="w-full">
      <div
        role="tablist"
        aria-label="Modes d'ingestion"
        className="flex gap-1 rounded-xl border border-border bg-navy/40 p-1 backdrop-blur-md"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-[11px] font-semibold transition sm:flex-row sm:justify-center sm:gap-2 sm:text-xs ${
                isActive ? "text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="ingestion-tab"
                  className="absolute inset-0 rounded-lg border border-border bg-card/90 shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.id === "file" ? "Scan" : tab.id === "text" ? "Texte" : "Ponts"}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-[200px]">
        {activeTab === "file" && (
          <FileUploadZone onItemsExtracted={replaceItems} />
        )}
        {activeTab === "bridge" && (
          <EcosystemBridge onItemsExtracted={mergeItems} />
        )}
        {activeTab === "text" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 rounded-2xl border border-border bg-card/50 p-4 backdrop-blur-md"
          >
            <label htmlFor="paste-text" className="text-xs font-medium text-slate-400">
              Collez une liste de courses (une ligne par article)
            </label>
            <textarea
              id="paste-text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              rows={6}
              placeholder={"3 pcs Oignons\n1 kg Riz\n2 L Jus d'orange"}
              className="w-full resize-none rounded-xl border border-border bg-navy/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500/40"
            />
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={handleAnalyzeText}
              className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/15 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-60"
            >
              {isAnalyzing ? "Analyse…" : "Analyser"}
            </button>
          </motion.div>
        )}
      </div>

      <ParsedItemsPreview
        items={items}
        onChange={setItems}
        onOptimize={() => onOptimize(items)}
      />
    </section>
  );
}
