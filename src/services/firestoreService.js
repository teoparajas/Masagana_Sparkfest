// src/services/firestoreService.js
// All Firestore read/write operations for FloodWatch MM.
// Components import functions from here — never import Firestore directly
// into a component, so swapping the backend later only touches this file.

import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  updateDoc,
  doc,
  serverTimestamp,
  limit,
  GeoPoint,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// ── Collection names ──────────────────────────────────────────────────────────
const REPORTS_COLLECTION = "reports";

// ── Report schema ─────────────────────────────────────────────────────────────
// {
//   location:    string  — human-readable e.g. "Marikina, near Tumana Bridge"
//   type:        string  — from dropdown: "Rising floodwater" | "Impassable road" | ...
//   description: string  — free text from the user
//   lat:         number  — GPS coords at time of submission
//   lng:         number  — GPS coords at time of submission
//   status:      string  — "pending" | "verified"
//   createdAt:   Timestamp — server timestamp
//   synced:      boolean — true once successfully written to Firestore
// }

// ── Submit a new report ───────────────────────────────────────────────────────

/**
 * Submit a community hazard report to Firestore.
 * @param {{ location, type, description, lat, lng }} reportData
 * @returns {Promise<string>} the new document ID
 */
export async function submitReport(reportData) {
  const docRef = await addDoc(collection(db, REPORTS_COLLECTION), {
    location:    reportData.location,
    type:        reportData.type,
    description: reportData.description,
    lat:         reportData.lat   ?? null,
    lng:         reportData.lng   ?? null,
    status:      "pending",
    createdAt:   serverTimestamp(),
    synced:      true,
  });
  return docRef.id;
}

// ── Real-time feed listener ───────────────────────────────────────────────────

/**
 * Subscribe to the reports collection in real time.
 * Returns an unsubscribe function — call it on component unmount.
 *
 * @param {(reports: Array) => void} onUpdate — called every time reports change
 * @param {(error: Error) => void}   onError
 * @returns {function} unsubscribe
 */
export function subscribeToReports(onUpdate, onError) {
  const q = query(
    collection(db, REPORTS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(50)   // cap at 50 most recent — keeps reads low for hackathon
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reports = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // convert Firestore Timestamp to JS Date for display
        createdAt: doc.data().createdAt?.toDate() ?? new Date(),
      }));
      onUpdate(reports);
    },
    onError
  );
}

// ── Fetch reports once (no real-time) ────────────────────────────────────────

/**
 * One-time fetch of all reports.
 * Use subscribeToReports() for the live feed — this is for the
 * Responder Dashboard initial load.
 */
export async function fetchAllReports() {
  const q = query(
    collection(db, REPORTS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() ?? new Date(),
  }));
}


// ── Validation rule — auto-verify reports ────────────────────────────────────

/**
 * Check if a newly submitted report should trigger verification.
 * Rule: 3+ reports within ~500m of the same location
 *       submitted in the last 2 hours → mark all matching as "verified".
 *
 * Called automatically after every submitReport().
 *
 * @param {{ lat: number, lng: number }} coords — coords of the new report
 */
export async function runValidationCheck(coords) {
  if (!coords.lat || !coords.lng) return;

  try {
    // fetch all pending reports — we filter by time and distance in JS
    // reason: serverTimestamp() resolves async on Firestore's side, so
    // a createdAt >= X query can miss the report that just triggered this check
    const q = query(
      collection(db, REPORTS_COLLECTION),
      where("status", "==", "pending"),
      limit(200)
    );

    const snapshot = await getDocs(q);
    const pending  = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

    // filter by time using local JS clock
    // (createdAt may be a Firestore Timestamp or null if still pending server write)
    const recentPending = pending.filter((r) => {
      if (!r.createdAt) return true; // include if timestamp not yet set
      const ms = r.createdAt?.toMillis
        ? r.createdAt.toMillis()           // Firestore Timestamp object
        : new Date(r.createdAt).getTime(); // fallback if already a Date
      return ms >= twoHoursAgo;
    });

    // filter to those within ~500m using lat/lng delta
    // 0.005 degrees ≈ 500m near the equator — good enough for Metro Manila
    const DELTA  = 0.005;
    const nearby = recentPending.filter(
      (r) =>
        r.lat != null &&
        r.lng != null &&
        Math.abs(r.lat - coords.lat) <= DELTA &&
        Math.abs(r.lng - coords.lng) <= DELTA
    );

    

    // if 3 or more nearby pending reports — verify all of them
    if (nearby.length >= 3) {
      const verifyPromises = nearby.map((r) =>
        updateDoc(doc(db, REPORTS_COLLECTION, r.id), { status: "verified" })
      );
      await Promise.all(verifyPromises);   
    } 


  } catch (err) {
    console.warn("runValidationCheck failed:", err.message);
    // non-critical — don't throw, just log
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Format a JS Date into a human-readable relative time string.
 * e.g. "just now", "5 min ago", "2 hrs ago"
 */
export function formatReportTime(date) {
  if (!date) return "";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1)   return "just now";
  if (minutes < 60)  return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? "1 hr ago" : `${hours} hrs ago`;
}