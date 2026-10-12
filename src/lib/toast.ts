"use client";

// Tiny toast channel. showToast() shows one now; queueToast() keeps one for the next page the learner opens
// (used when a lesson ends and sends them back to the level page).

const EVENT = "kaizen:toast";
const KEY = "kaizen:queued-toast";

export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
}

export function queueToast(message: string) {
  try {
    sessionStorage.setItem(KEY, message);
  } catch {
    // Private windows can block storage. The toast is a nicety, so it is fine to lose it.
  }
}

export function takeQueuedToast(): string | null {
  try {
    const message = sessionStorage.getItem(KEY);
    if (message) sessionStorage.removeItem(KEY);
    return message;
  } catch {
    return null;
  }
}

export const TOAST_EVENT = EVENT;
