import { supabase } from "./supabaseClient";
import { STORAGE_KEYS } from "../constants/config";

export type GuardianNotificationType =
  | "medication_taken"
  | "medication_snoozed"
  | "medication_unconfirmed"
  | "schedule_updated"
  | "game_completed";

export interface GuardianNotificationPayload {
  guardianLinkId?: string;
  userId?: string;
  type: GuardianNotificationType;
  seniorName?: string;
  medication?: string;
  time?: string;
}

export interface GuardianNotificationResult {
  ok: boolean;
  sent?: boolean;
  skipped?: boolean;
  error?: string;
}

export interface GuardianInviteResult {
  guardianLinkId: string;
  pairingToken: string;
  telegramUrl: string;
  alreadyConnected?: boolean;
  telegramFirstName?: string;
  telegramUsername?: string;
}

export interface GuardianStatusResult {
  guardianLinkId?: string;
  connected: boolean;
  telegramFirstName?: string;
  telegramUsername?: string;
  connectedAt?: string;
  pairingToken?: string;
}

const SUPABASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  "https://znsjrujhsadiywsimywf.supabase.co";

const SUPABASE_ANON_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) || "";

/**
 * Resolves the currently active guardian link ID dynamically.
 * Prioritizes local user profile and local storage.
 * NO HARDCODED IDS OR TEST ENVIRONMENT FALLBACKS.
 */
export function getActiveGuardianLinkId(): string | null {
  try {
    const directStorage = localStorage.getItem(STORAGE_KEYS.GUARDIAN_LINK_ID);
    if (directStorage !== null) {
      const trimmed = directStorage.trim();
      if (trimmed === "" || trimmed === "none" || trimmed === "null") {
        return null;
      }
      return trimmed;
    }

    const profileStr = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      if (profile.guardianLinkId !== undefined) {
        if (!profile.guardianLinkId || profile.guardianLinkId === "none") {
          return null;
        }
        return profile.guardianLinkId.trim();
      }
    }
  } catch {
    // Storage access fallback
  }

  return null;
}

/**
 * Persists an active guardian link ID locally.
 */
export function setActiveGuardianLinkId(id: string | null): void {
  try {
    if (id && id.trim() && id !== "none" && id !== "null") {
      localStorage.setItem(STORAGE_KEYS.GUARDIAN_LINK_ID, id.trim());
    } else {
      localStorage.setItem(STORAGE_KEYS.GUARDIAN_LINK_ID, "none");
    }
  } catch {}
}

/**
 * Retrieves the current senior user's name dynamically from stored profile.
 */
function getSeniorName(): string {
  try {
    const profileStr = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      if (profile.name && typeof profile.name === "string") {
        return profile.name.trim();
      }
    }
  } catch {}
  return "Пользователь";
}

/**
 * Retrieves the current senior user's ID dynamically from stored profile.
 */
export function getSeniorUserId(): string | null {
  try {
    const profileStr = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      if (profile.id && typeof profile.id === "string") {
        return profile.id.trim();
      }
    }
  } catch {}
  return null;
}

/**
 * Requests creation of a real guardian invitation from Supabase Edge Function `create-guardian-invite`.
 * Generates a unique, URL-safe Telegram pairing link:
 * https://t.me/CareTrackGuardianBot?start={pairingToken}
 */
export async function createGuardianInvite(
  userId: string,
  seniorName: string,
  replace: boolean = false
): Promise<GuardianInviteResult> {
  const url = `${SUPABASE_URL}/functions/v1/create-guardian-invite`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(SUPABASE_ANON_KEY ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
    },
    body: JSON.stringify({
      userId,
      seniorName: seniorName.trim() || "Пользователь",
      replace,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create guardian invite (${res.status}): ${errText}`);
  }

  const data: GuardianInviteResult = await res.json();
  if (data.guardianLinkId) {
    setActiveGuardianLinkId(data.guardianLinkId);
  }

  return data;
}

/**
 * Queries the current live connection status of the guardian from Supabase Edge Function `create-guardian-invite`.
 */
export async function checkGuardianStatus(
  guardianLinkId?: string,
  userId?: string
): Promise<GuardianStatusResult> {
  const targetLinkId = guardianLinkId || getActiveGuardianLinkId();
  const targetUserId = userId || getSeniorUserId();

  if (!targetLinkId && !targetUserId) {
    return { connected: false };
  }

  const queryParams = new URLSearchParams();
  if (targetLinkId) queryParams.set("guardianLinkId", targetLinkId);
  else if (targetUserId) queryParams.set("userId", targetUserId);

  const url = `${SUPABASE_URL}/functions/v1/create-guardian-invite?${queryParams.toString()}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...(SUPABASE_ANON_KEY ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
      },
    });

    if (!res.ok) {
      return { connected: false };
    }

    const data: GuardianStatusResult = await res.json();

    if (data.connected && data.guardianLinkId) {
      setActiveGuardianLinkId(data.guardianLinkId);
    }

    return data;
  } catch (err) {
    console.warn("[GuardianNotifications] Error checking guardian status:", err);
    return { connected: false };
  }
}

/**
 * Backward compatibility alias for checkGuardianStatus
 */
export const checkGuardianConnection = checkGuardianStatus;

/**
 * Core Guardian Notification Dispatcher.
 * Invokes the Supabase Edge Function 'notify-guardian'.
 *
 * SAFETY & PRODUCT RULES:
 * 1. Guardian is strictly optional: if not connected, silently skips without throwing.
 * 2. Notification failures NEVER break medication functionality or block user flow.
 * 3. Never routes by telegram username — only routes to verified `telegram_chat_id`.
 * 4. Never claims medication was "not taken" when confirmation is unknown.
 */
export async function notifyGuardian(
  payload: GuardianNotificationPayload
): Promise<GuardianNotificationResult> {
  const guardianLinkId = payload.guardianLinkId || getActiveGuardianLinkId();
  const userId = payload.userId || getSeniorUserId() || undefined;

  // If no guardian link is configured, gracefully skip
  if (!guardianLinkId && !userId) {
    console.log(
      `[GuardianNotifications] No guardian link configured for ${payload.type}. Silently skipping.`
    );
    return { ok: true, sent: false, skipped: true };
  }

  const seniorName = payload.seniorName || getSeniorName();

  const body: Record<string, unknown> = {
    guardianLinkId: guardianLinkId || undefined,
    userId,
    type: payload.type,
    seniorName,
  };

  if (payload.medication) {
    body.medication = payload.medication;
  }
  if (payload.time) {
    body.time = payload.time;
  }

  try {
    console.log(
      `[GuardianNotifications] Dispatching '${payload.type}' for ${seniorName} to guardian...`
    );

    const { data, error } = await supabase.functions.invoke("notify-guardian", {
      body,
    });

    if (error) {
      console.warn(
        `[GuardianNotifications] Notification '${payload.type}' returned edge error (non-fatal):`,
        error
      );
      return { ok: false, sent: false, error: error.message };
    }

    console.log(
      `[GuardianNotifications] Notification '${payload.type}' successfully sent:`,
      data
    );
    return { ok: true, sent: true };
  } catch (err) {
    // Non-blocking catch to ensure medication flow continues unaffected
    console.warn(
      `[GuardianNotifications] Network failure while sending '${payload.type}' (non-fatal):`,
      err
    );
    return { ok: false, sent: false, error: String(err) };
  }
}
