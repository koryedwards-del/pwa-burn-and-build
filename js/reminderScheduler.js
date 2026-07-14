/** Meal reminders — every 3 hours from wake time. */

import { localDateKey } from './programPackage.js';

export const MEAL_HOUR_OFFSETS = [0, 3, 6, 9, 12, 15];
export const REMINDER_TITLE = 'Time to Burn & Build';

const FIRED_KEY = 'bnb_reminder_fired';
const MAX_LOOKAHEAD_DAYS = 2;

let pageTimers = [];

export function remindersAreSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function reminderPermission() {
  if (!remindersAreSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestReminderPermission() {
  if (!remindersAreSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

function loadFiredKeys() {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function saveFiredKeys(keys) {
  localStorage.setItem(FIRED_KEY, JSON.stringify(keys));
}

function reminderFireKey(dateKey, hoursOffset) {
  return `${dateKey}|${hoursOffset}`;
}

function markReminderFired(dateKey, hoursOffset) {
  const keys = loadFiredKeys();
  keys[reminderFireKey(dateKey, hoursOffset)] = Date.now();
  const cutoff = Date.now() - 3 * 86400000;
  for (const [key, ts] of Object.entries(keys)) {
    if (Number(ts) < cutoff) delete keys[key];
  }
  saveFiredKeys(keys);
}

function wasReminderFired(dateKey, hoursOffset) {
  return !!loadFiredKeys()[reminderFireKey(dateKey, hoursOffset)];
}

function parseWakeTime24(wakeTime) {
  const [h, m] = String(wakeTime || '06:00').split(':').map(Number);
  return {
    hour: Number.isFinite(h) ? h : 6,
    minute: Number.isFinite(m) ? m : 0,
  };
}

/** Fire time for wake + N hours on a given calendar day (local). */
export function mealFireDate(wakeTime, hoursOffset, day = new Date()) {
  const { hour, minute } = parseWakeTime24(wakeTime);
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const totalMinutes = hour * 60 + minute + hoursOffset * 60;
  return new Date(dayStart.getTime() + totalMinutes * 60 * 1000);
}

export function buildReminderSchedule(wakeTime, mealSlots, now = new Date()) {
  const slots = Array.isArray(mealSlots) ? mealSlots : [];
  const schedule = [];

  for (let dayOffset = 0; dayOffset < MAX_LOOKAHEAD_DAYS; dayOffset += 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + dayOffset);
    const dateKey = localDateKey(day);

    MEAL_HOUR_OFFSETS.forEach((hoursOffset, index) => {
      const slot = slots[index] || { label: `Meal ${index + 1}` };
      const fireAt = mealFireDate(wakeTime, hoursOffset, day);
      if (fireAt <= now) return;
      if (wasReminderFired(dateKey, hoursOffset)) return;
      schedule.push({
        fireAt,
        dateKey,
        hoursOffset,
        label: slot.label,
        time: slot.time || '',
      });
    });
  }

  schedule.sort((a, b) => a.fireAt - b.fireAt);
  return schedule;
}

async function showReminderNotification(entry) {
  const body = entry.time ? `${entry.label} · ${entry.time}` : entry.label;
  const options = {
    body,
    tag: `bnb-meal-${entry.dateKey}-${entry.hoursOffset}`,
    icon: '../icons/icon-192.png',
    badge: '../icons/icon-192.png',
    data: { screen: 'plan', meal: entry.label },
  };

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(REMINDER_TITLE, options);
      return;
    } catch {
      /* fall through */
    }
  }

  if (reminderPermission() === 'granted') {
    new Notification(REMINDER_TITLE, options);
  }
}

function postScheduleToServiceWorker(schedule) {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: 'SCHEDULE_REMINDERS',
    reminders: schedule.map((entry) => ({
      at: entry.fireAt.getTime(),
      title: REMINDER_TITLE,
      body: entry.time ? `${entry.label} · ${entry.time}` : entry.label,
      tag: `bnb-meal-${entry.dateKey}-${entry.hoursOffset}`,
      dateKey: entry.dateKey,
      hoursOffset: entry.hoursOffset,
    })),
  });
}

export function clearScheduledReminders() {
  pageTimers.forEach((id) => clearTimeout(id));
  pageTimers = [];
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_REMINDERS' });
  }
}

export function syncMealReminders({ enabled, wakeTime, mealSlots, now = new Date() } = {}) {
  clearScheduledReminders();

  if (!enabled || reminderPermission() !== 'granted' || !wakeTime) {
    return { scheduled: 0 };
  }

  const schedule = buildReminderSchedule(wakeTime, mealSlots, now);
  if (!schedule.length) return { scheduled: 0 };

  pageTimers = schedule.map((entry) => {
    const delay = Math.max(0, entry.fireAt.getTime() - now.getTime());
    return window.setTimeout(() => {
      markReminderFired(entry.dateKey, entry.hoursOffset);
      showReminderNotification(entry);
      syncMealReminders({ enabled, wakeTime, mealSlots });
    }, delay);
  });

  postScheduleToServiceWorker(schedule);
  return { scheduled: schedule.length };
}
