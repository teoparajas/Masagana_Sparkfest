// src/services/reportQueueService.js
// Offline report queue — upgraded from localStorage to IndexedDB (Dexie).
// Reason: localStorage is not accessible from Service Workers (needed for Day 4).
// All queue operations are now async — update all callers accordingly.

import { db } from "./db";
import { submitReport, runValidationCheck } from "./firestoreService";

let isFlushing = false;

// ── Queue operations ──────────────────────────────────────────────────────────

/**
 * Get all queued reports.
 * @returns {Promise<Array>}
 */
export async function getQueue() {
  try {
    return await db.reportQueue.orderBy("queuedAt").toArray();
  } catch (err) {
    console.warn("getQueue failed:", err.message);
    return [];
  }
}

/**
 * Add a report to the offline queue.
 * @param {object} reportData
 * @returns {Promise<string>} the localId of the queued entry
 */
export async function addToQueue(reportData) {
  const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  try {
    await db.reportQueue.put({
      ...reportData,
      localId,
      queuedAt: Date.now(),
    });
  } catch (err) {
    console.warn("addToQueue failed:", err.message);
  }
  return localId;
}

/**
 * Remove a single report from the queue by localId.
 * @param {string} localId
 */
async function removeFromQueue(localId) {
  try {
    await db.reportQueue.delete(localId);
    // verify removal
    const stillExists = await db.reportQueue.get(localId);
    if (stillExists) {
      console.warn("removeFromQueue failed for:", localId);
    }
  } catch (err) {
    console.warn("removeFromQueue failed:", err.message);
  }
}

/**
 * Get the number of reports currently in the queue.
 * @returns {Promise<number>}
 */
export async function getQueueCount() {
  try {
    return await db.reportQueue.count();
  } catch {
    return 0;
  }
}

/**
 * Clear the entire queue.
 * Use only for testing/debugging.
 */
export async function clearEntireQueue() {
  try {
    await db.reportQueue.clear();
  } catch (err) {
    console.warn("clearEntireQueue failed:", err.message);
  }
}

// ── Flush queue to Firestore ──────────────────────────────────────────────────

/**
 * Sync all queued offline reports to Firestore.
 * Only call when confirmed back online.
 * Uses isFlushing lock to prevent concurrent runs.
 *
 * @returns {Promise<number>} number of reports successfully synced
 */
export async function flushQueue() {
  if (isFlushing) {
    return 0;
  }

  const queue = await getQueue();
  if (!queue.length) return 0;

  isFlushing = true;

  let synced = 0;

  for (const report of queue) {
    try {
      const { localId, queuedAt, isQueued, ...reportData } = report;

      await submitReport(reportData);

      if (reportData.lat && reportData.lng) {
        await runValidationCheck({
          lat: reportData.lat,
          lng: reportData.lng,
        });
      }

      await removeFromQueue(localId);
      synced++;
    } catch (err) {
      console.warn("Failed to sync queued report:", err.message);
    }
  }

  isFlushing = false;
  const remaining = await getQueueCount();
  return synced;
}