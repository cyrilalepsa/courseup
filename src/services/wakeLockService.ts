type WakeLockSentinelLike = {
  release: () => Promise<void>;
};

export async function acquireScreenWakeLock(): Promise<WakeLockSentinelLike | null> {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & {
    wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
  };
  if (!nav.wakeLock?.request) return null;
  try {
    return await nav.wakeLock.request("screen");
  } catch {
    return null;
  }
}

export async function releaseScreenWakeLock(
  sentinel: WakeLockSentinelLike | null,
): Promise<void> {
  if (!sentinel) return;
  try {
    await sentinel.release();
  } catch {
    /* ignore */
  }
}
