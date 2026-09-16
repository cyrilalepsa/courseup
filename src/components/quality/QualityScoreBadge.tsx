import type { QualityScore } from "@/types/item";

const SCORE_CLASS: Record<QualityScore, string> = {
  A: "neria-badge-score-a",
  B: "neria-badge-score-b",
  C: "neria-badge-score-c",
  D: "neria-badge-score-d",
  E: "neria-badge-score-e",
  F: "neria-badge-score-f",
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

  const dim = size === "md" ? "neria-badge-md" : "neria-badge-sm";

  return (
    <span
      className={`neria-badge ${SCORE_CLASS[score]} ${dim} ${className}`}
      title={`Nutri-Score ${score}`}
      aria-label={`Nutri-Score ${score}`}
    >
      {score}
    </span>
  );
}
