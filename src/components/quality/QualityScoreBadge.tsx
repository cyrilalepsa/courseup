import type { QualityScore } from "@/types/ingestion";

const SCORE_CLASS: Record<QualityScore, string> = {
  A: "bg-emerald-600 text-white border-emerald-700",
  B: "bg-lime-500 text-slate-900 border-lime-600",
  C: "bg-yellow-400 text-slate-900 border-yellow-500",
  D: "bg-orange-500 text-white border-orange-600",
  E: "bg-red-500 text-white border-red-600",
  F: "bg-red-800 text-white border-red-900",
};

interface QualityScoreBadgeProps {
  score?: QualityScore;
  size?: "sm" | "md";
  className?: string;
}

export function QualityScoreBadge({
  score,
  size = "sm",
  className = "",
}: QualityScoreBadgeProps) {
  if (!score) return null;

  const dim = size === "md" ? "h-7 w-7 text-sm" : "h-6 w-6 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md border font-black ${SCORE_CLASS[score]} ${dim} ${className}`}
      title={`Nutri-Score ${score}`}
      aria-label={`Nutri-Score ${score}`}
    >
      {score}
    </span>
  );
}
