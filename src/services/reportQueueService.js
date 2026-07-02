// src/services/reportQueueService.js
// Offline-first report queue.
// When offline: saves reports to localStorage.
// When back online: auto-flushes queued reports to Firestore.
// This is the lightweight version — Day 4 upgrades storage to IndexedDB.

import { submitReport, runValidationCheck } from "./firestoreService";

const QUEUE_KEY = "fw_report_queue";

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
  return entry.localId;
}

function removeFromQueue(localId) {
  const queue = getQueue().filter((r) => r.localId !== localId);
  saveQueue(queue);
}

export function getQueueCount() {
  return getQueue().length;
}

// ── Flush queue to Firestore ──────────────────────────────────────────────────

/**
 * Attempt to sync all queued offline reports to Firestore.
 * Call this when the app detects it's back online.
 * Returns the number of reports successfully synced.
 */
export async function flushQueue() {
  const queue = getQueue();
  if (!queue.length) return 0;

  console.log(`🔄 Flushing ${queue.length} queued report(s) to Firestore...`);

  let synced = 0;
  for (const report of queue) {
    try {
      const { localId, queuedAt, ...reportData } = report;
      await submitReport(reportData);
      await runValidationCheck({ lat: reportData.lat, lng: reportData.lng });
      removeFromQueue(localId);
      synced++;
    } catch (err) {
      console.warn("Failed to sync queued report:", err.message);
      // leave it in the queue — will retry next time online
    }
  }

  console.log(`✅ Synced ${synced}/${queue.length} queued reports.`);
  return synced;
}