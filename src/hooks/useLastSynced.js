// src/hooks/useLastSynced.js
// Tracks the last time data was successfully fetched from the network.
// Persists to IndexedDB so it survives page refreshes.
// Used by OfflineBanner to show "last updated X min ago".

import { useEffect, useState, useCallback } from "react";
import { setAppMeta, getAppMeta } from "../services/cacheService";

const META_KEY = "last_synced_at";

export function useLastSynced() {
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  // load persisted timestamp from IndexedDB on mount
  useEffect(() => {
    getAppMeta(META_KEY).then((val) => {
      if (val) setLastSyncedAt(val);
    });
  }, []);

  // call this whenever a live data fetch succeeds
  const markSynced = useCallback(async () => {
    const now = Date.now();
    setLastSyncedAt(now);
    await setAppMeta(META_KEY, now);
  }, []);

  return { lastSyncedAt, markSynced };
}