const AFFILIATION_MODE_STORAGE_KEY = "courseup:affiliation-mode";

export function isAffiliationTrackingActive(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(AFFILIATION_MODE_STORAGE_KEY) !== "passive";
}

export function setAffiliationTrackingActive(active: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(AFFILIATION_MODE_STORAGE_KEY, active ? "active" : "passive");
}

export function getAffiliationModeLabel(): "active" | "passive" {
  return isAffiliationTrackingActive() ? "active" : "passive";
}
