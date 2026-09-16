import { motion } from "framer-motion";
import { Camera, FileUp, Link2, Share2, Type } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExportModal } from "@/components/export/ExportModal";
import { useCourseUp } from "@/context/CourseUpContext";
import { createExportBundle } from "@/services/exportService";
import { parseReceiptText } from "@/services/textParserService";
import type { IngestedItem } from "@/types/ingestion";
import { EcosystemBridge } from "@/components/ecosystem/EcosystemBridge";
import { FileUploadZone } from "./FileUploadZone";
import { ParsedItemsPreview } from "./ParsedItemsPreview";
import { TicketScanZone } from "./TicketScanZone";

type TabId = "scan" | "text" | "file" | "bridge";

const tabs: { id: TabId; label: string; icon: typeof Camera }[] = [
  { id: "scan", label: "Photo ticket", icon: Camera },
  { id: "text", label: "Collage texte", icon: Type },
  { id: "file", label: "Import fichier", icon: FileUp },
  { id: "bridge", label: "Ponts Écosystème", icon: Link2 },
];

interface IngestionHubProps {
  onOptimize: () => void;
}

export function IngestionHub({ onOptimize }: IngestionHubProps) {
  const { items, setItems } = useCourseUp();
  const [activeTab, setActiveTab] = useState<TabId>("scan");
  const [textValue, setTextValue] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportSession, setExportSession] = useState(0);

  const openExportModal = useCallback(() => {
    setExportSession((n) => n + 1);
    setExportOpen(true);
  }, []);

  const exportBundle = useMemo(
    () => createExportBundle("ingestion", items),
    [items],
  );

  const parsedPreview = useMemo(
    () => (textValue.trim() ? parseReceiptText(textValue, "text") : []),
    [textValue],
  );

  const mergeItems = useCallback(
    (incoming: IngestedItem[]) => {
      const byName = new Map(items.map((i) => [i.name.toLowerCase(), i]));
      for (const item of incoming) {
        byName.set(item.name.toLowerCase(), item);
      }
      setItems(Array.from(byName.values()));
    },
    [items, setItems],
  );

  const replaceItems = useCallback(
    (incoming: IngestedItem[]) => {
      setItems(incoming);
    },
    [setItems],
  );

  useEffect(() => {
    if (activeTab !== "text") return;
    if (!textValue.trim()) return;
    const handle = window.setTimeout(() => {
      replaceItems(parsedPreview);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [activeTab, parsedPreview, replaceItems, textValue]);

  return (
    <section className="w-full">
      <div
        role="tablist"
        aria-label="Modes d'ingestion"
        className="neria-card flex gap-1 p-1"
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
              className={`relative flex flex-1 flex-col items-center gap-1 px-1.5 py-2.5 text-[10px] font-semibold transition sm:px-2 sm:text-xs ${
                isActive ? "neria-tab-active" : "neria-tab-idle"
              }`}
            >
              <span className="relative z-10 inline-flex flex-col items-center gap-1 sm:flex-row">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-[200px]">
        {activeTab === "scan" && <TicketScanZone onItemsExtracted={replaceItems} />}
        {activeTab === "file" && <FileUploadZone onItemsExtracted={replaceItems} />}
        {activeTab === "bridge" && (
          <EcosystemBridge showImport showExport={false} onItemsExtracted={mergeItems} items={items} />
        )}
        {activeTab === "text" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="neria-card space-y-3 p-4"
          >
            <label htmlFor="paste-text" className="text-xs font-medium text-slate-600">
              Collez un ticket ou une liste (parser dynamique FR)
            </label>
            <textarea
              id="paste-text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              rows={8}
              placeholder={
                "2x LAIT DEMI ECREME 1.45€\nPAIN DE MIE 500G - 2,10 €\n3 pcs Oignons"
              }
              className="neria-input w-full resize-none px-3 py-2.5 font-mono text-sm placeholder:text-slate-500"
            />
            <p className="text-[11px] text-slate-600">
              Analyse instantanée · {parsedPreview.length} ligne
              {parsedPreview.length > 1 ? "s" : ""} détectée
              {parsedPreview.length > 1 ? "s" : ""}
            </p>
          </motion.div>
        )}
      </div>

      {items.length > 0 && (
        <motion.button
          type="button"
          onClick={openExportModal}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-white/95 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.98 }}
        >
          <Share2 className="h-4 w-4 text-blue-600" />
          Exporter / Partager la liste
        </motion.button>
      )}

      <ExportModal
        key={exportSession}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        bundle={exportBundle}
      />

      <ParsedItemsPreview items={items} onChange={setItems} onOptimize={onOptimize} />
    </section>
  );
}
