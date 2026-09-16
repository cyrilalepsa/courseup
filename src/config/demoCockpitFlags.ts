/** Active la barre recette Cockpit (dev ou flag explicite build). */
export function isDemoCockpitBarEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  return import.meta.env.VITE_DEMO_COCKPIT === "true";
}
