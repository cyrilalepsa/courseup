import { AnimatePresence, motion } from "framer-motion";
import {
  ExternalLink,
  Fingerprint,
  Grid3X3,
  KeyRound,
  Shield,
  User,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { UserAvatar } from "@/components/common/UserAvatar";
import { AvatarCustomizer } from "@/components/profile/AvatarCustomizer";
import { OrderHistoryTab } from "@/components/profile/OrderHistoryTab";
import { useCourseUp } from "@/context/useCourseUp";
import {
  authMethodLabel,
  enablePasskeyForCurrentUser,
  enablePatternForCurrentUser,
  getNeriaCredentialMeta,
  isNeriaPremiumUser,
  listSelectableBonusApps,
  NERIA_CLIENT_PORTAL_URL,
  resolveNeriaPlanDisplay,
  updateSelectedBonusApp,
} from "@/services/neriaAuthService";
import type { NeriaAppId } from "@/types/neriaAuth";

type ProfileTab = "account" | "orders" | "subscription" | "avatar";

const APP_LABELS: Record<NeriaAppId, string> = {
  courseup: "CourseUp",
  heritia: "Heritia",
  mamandouce: "MamanDouce",
};

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function UserProfileModal({ open, onClose }: UserProfileModalProps) {
  const {
    neriaAuthSession,
    ordersHistory,
    reloadOrderFromHistory,
    signInDemoNeriaPasskey: signInPasskey,
  } = useCourseUp();

  const [tab, setTab] = useState<ProfileTab>("account");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const user = neriaAuthSession?.user;
  const premium = user ? isNeriaPremiumUser(user) : false;
  const credentials = user ? getNeriaCredentialMeta(user.id) : null;

  const preferredMethod =
    user?.preferredAuthMethod ?? neriaAuthSession?.authMethod ?? "password";

  const bonusApps = useMemo(() => listSelectableBonusApps(), []);
  const selectedBonus =
    user?.subscription.selectedBonusApp ?? user?.subscription.bonusApps[0]?.appId;

  const run = useCallback(async (action: () => Promise<void> | void, okMsg: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage(okMsg);
    } catch {
      setMessage("Action impossible — réessayez.");
    } finally {
      setBusy(false);
    }
  }, []);

  const guestPanel = (
    <div className="space-y-4 text-center">
      <UserAvatar initials="?" size="lg" className="mx-auto" />
      <p className="text-sm font-semibold text-slate-800">Connectez votre compte NeriaCorp</p>
      <p className="text-[11px] text-slate-600">
        Profil unifié, historique des commandes et avatar synchronisés sur toutes les apps.
      </p>
      <button
        type="button"
        disabled={busy}
        className="neria-cta-primary w-full py-2.5 text-sm"
        onClick={() =>
          run(async () => {
            await signInPasskey();
          }, "Connexion Passkey simulée")
        }
      >
        <Fingerprint className="mr-1 inline h-4 w-4" />
        Connexion biométrique (démo)
      </button>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="neria-profile-title"
            className="neria-profile-glass flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl shadow-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-violet-600" />
                <h2 id="neria-profile-title" className="text-sm font-bold text-slate-900">
                  Profil &amp; Compte
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-500 hover:bg-white/60"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!user ? (
              <div className="overflow-y-auto p-4">{guestPanel}</div>
            ) : (
              <>
                <div className="flex gap-1 border-b border-white/15 px-3 py-2">
                  {(
                    [
                      ["account", "Compte"],
                      ["orders", "Commandes"],
                      ["subscription", "Abonnement"],
                      ["avatar", "Avatar"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={`flex-1 rounded-lg px-1 py-1.5 text-[10px] font-semibold ${
                        tab === id ? "neria-tab-active" : "neria-tab-idle text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {tab === "account" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 rounded-2xl border border-white/30 bg-white/45 p-3 backdrop-blur-md">
                        <UserAvatar
                          displayName={user.displayName}
                          avatar={user.avatar}
                          premium={premium}
                          size="lg"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {user.displayName}
                          </p>
                          <p className="truncate text-[11px] text-slate-600">{user.email}</p>
                          <p className="mt-1 text-[10px] text-violet-700">
                            {authMethodLabel(preferredMethod)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 rounded-2xl border border-white/25 bg-white/40 p-3 backdrop-blur-sm">
                        <p className="text-[11px] font-semibold text-slate-800">
                          Sécurité &amp; déverrouillage
                        </p>
                        {!credentials?.methods.includes("passkey") && (
                          <button
                            type="button"
                            disabled={busy}
                            className="flex w-full items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/90 px-3 py-2 text-left text-[11px] font-medium text-violet-900"
                            onClick={() =>
                              run(async () => {
                                await enablePasskeyForCurrentUser();
                              }, "Passkey activée sur cet appareil")
                            }
                          >
                            <Fingerprint className="h-4 w-4 shrink-0" />
                            Activer la biométrie (Passkey)
                          </button>
                        )}
                        {!credentials?.methods.includes("pattern") && (
                          <button
                            type="button"
                            disabled={busy}
                            className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-left text-[11px] font-medium text-slate-800"
                            onClick={() =>
                              run(async () => {
                                await enablePatternForCurrentUser("1234");
                              }, "Schéma mobile enregistré (démo 1234)")
                            }
                          >
                            <Grid3X3 className="h-4 w-4 shrink-0" />
                            Configurer un schéma mobile
                          </button>
                        )}
                        {credentials?.methods.includes("passkey") && (
                          <p className="flex items-center gap-1 text-[10px] text-emerald-700">
                            <Shield className="h-3 w-3" />
                            Passkey active sur cet appareil
                          </p>
                        )}
                        {credentials?.methods.includes("pattern") && (
                          <p className="flex items-center gap-1 text-[10px] text-emerald-700">
                            <KeyRound className="h-3 w-3" />
                            Schéma mobile configuré
                          </p>
                        )}
                      </div>

                      <a
                        href={NERIA_CLIENT_PORTAL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/90 py-2.5 text-xs font-semibold text-blue-900"
                      >
                        Accéder à mon Espace Client NeriaCorp
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}

                  {tab === "orders" && (
                    <OrderHistoryTab
                      orders={ordersHistory}
                      onReloadOrder={reloadOrderFromHistory}
                    />
                  )}

                  {tab === "subscription" && (
                    <div className="space-y-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-700">
                        Mon Abonnement NeriaCorp
                      </p>
                      <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/90 to-white/70 p-4 backdrop-blur-md">
                        <p className="text-lg font-bold text-slate-900">
                          {resolveNeriaPlanDisplay(user)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-600">
                          Statut {user.subscription.status} · App principale{" "}
                          {APP_LABELS[user.subscription.primaryApp]}
                        </p>
                        {user.subscription.allAccess && (
                          <p className="mt-2 text-[10px] font-medium text-amber-800">
                            Toutes les applications NeriaCorp incluses.
                          </p>
                        )}
                      </div>

                      {!user.subscription.allAccess && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold text-slate-800">
                            App bonus à -50 %
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {bonusApps.map((appId) => (
                              <button
                                key={appId}
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void run(async () => {
                                    await updateSelectedBonusApp(appId);
                                    setMessage(`App bonus : ${APP_LABELS[appId]} (-50 %)`);
                                  }, `App bonus : ${APP_LABELS[appId]}`)
                                }
                                className={`rounded-xl border px-3 py-3 text-left text-[11px] font-semibold transition ${
                                  selectedBonus === appId
                                    ? "border-violet-500 bg-violet-50 text-violet-900 ring-2 ring-violet-300"
                                    : "border-slate-200 bg-white/70 text-slate-700 hover:border-violet-200"
                                }`}
                              >
                                {APP_LABELS[appId]}
                                <span className="mt-0.5 block text-[9px] font-normal text-slate-500">
                                  -50 % la 2ᵉ app
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {tab === "avatar" && (
                    <AvatarCustomizer user={user} onSaved={() => setMessage("Avatar mis à jour")} />
                  )}
                </div>
              </>
            )}

            {message && (
              <p className="border-t border-white/15 px-4 py-2 text-center text-[10px] font-medium text-emerald-700">
                {message}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
