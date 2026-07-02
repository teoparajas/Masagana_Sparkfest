// src/services/reportQueueService.js
// Offline-first report queue.
// When offline: saves reports to localStorage.
// When back online: auto-flushes queued reports to Firestore.
// Uses a flush lock to prevent concurrent sync attempts.

import { submitReport, runValidationCheck } from "./firestoreService";

const QUEUE_KEY = "fw_report_queue";
let isFlushing  = false; // module-level lock — prevents concurrent flush attempts

// ── Queue operations ──────────────────────────────────────────────────────────

export function getQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn("Queue save failed:", e);
  }
}

export function addToQueue(reportData) {
  const queue = getQueue();
  const entry = {
    ...reportData,
    queuedAt: Date.now(),
    localId:  `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  };
  queue.push(entry);
  saveQueue(queue);
  console.log("📥 Queued offline report:", entry.localId);
  return entry.localId;
}

function removeFromQueue(localId) {
  const before = getQueue();
  const after  = before.filter((r) => r.localId !== localId);
  saveQueue(after);

  // verify removal actually worked
  const stillExists = getQueue().find((r) => r.localId === localId);
  if (stillExists) {
    console.warn("⚠️ removeFromQueue failed for:", localId);
  } else {
    console.log("🗑 Removed from queue:", localId);
  }
}

export function getQueueCount() {
  return getQueue().length;
}

export function clearEntireQueue() {
  localStorage.removeItem(QUEUE_KEY);
  console.log("🧹 Queue cleared.");
}

// ── Flush queue to Firestore ──────────────────────────────────────────────────

/**
 * Attempt to sync all queued offline reports to Firestore.
 * Only call this when the app is confirmed back online.
 * Uses isFlushing lock to prevent concurrent runs.
 * Returns the number of reports successfully synced.
 */
export async function flushQueue() {
  // prevent concurrent flushes — only one at a time
  if (isFlushing) {
    console.log("⏳ Flush already in progress — skipping.");
    return 0;
  }

  const queue = getQueue();
  if (!queue.length) return 0;

  isFlushing = true;
  console.log(`🔄 Flushing ${queue.length} queued report(s)...`);

  let synced = 0;

  for (const report of queue) {
    try {
      // strip local-only fields before sending to Firestore
      const { localId, queuedAt, isQueued, ...reportData } = report;

      await submitReport(reportData);

      // run validation check after each synced report
      if (reportData.lat && reportData.lng) {
        await runValidationCheck({
          lat: reportData.lat,
          lng: reportData.lng,
        });
      }

      // remove immediately after confirmed Firestore write
      removeFromQueue(localId);
      synced++;
      console.log(`✅ Synced and removed: ${localId}`);

    } catch (err) {
      console.warn("❌ Failed to sync queued report:", err.message);
      // leave in queue — will retry on next flush
    }
  }

  isFlushing = false;
  console.log(`✅ Flush complete: ${synced} synced, ${getQueueCount()} remaining.`);
  return synced;
}