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

/**
 * Resolves the currently active guardian link ID dynamically.
 * Prioritizes local user profile / local storage, then deployment environment variable.
 * No hardcoded test UUIDs in production flows.
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

  const envId = import.meta.env.VITE_GUARDIAN_LINK_ID;
  if (envId && typeof envId === "string" && envId.trim()) {
    return envId.trim();
  }

  return null;
}

/**
 * Persists an active guardian link ID locally
 */
export function setActiveGuardianLinkId(id: string | null): void {
  try {
    if (id && id.trim() && id !== "none") {
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
 * Optional status check to verify if the guardian is connected before dispatching.
 */
export async function checkGuardianConnection(
  customLinkId?: string
): Promise<{ connected: boolean; guardian?: Record<string, unknown> | null }> {
  const linkId = customLinkId || getActiveGuardianLinkId();
  if (!linkId) {
    return { connected: false, guardian: null };
  }

  try {
    const { data, error } = await supabase
      .from("guardian_links")
      .select("id, senior_name, telegram_connected, telegram_username, telegram_first_name, connected_at")
      .eq("id", linkId)
      .maybeSingle();

    if (error || !data) {
      return { connected: false, guardian: null };
    }

    return {
      connected: Boolean(data.telegram_connected),
      guardian: data,
    };
  } catch {
    return { connected: false, guardian: null };
  }
}

/**
 * Core Guardian Notification Dispatcher.
 * Invokes the Supabase Edge Function 'notify-guardian'.
 *
 * SAFETY RULES:
 * 1. Guardian is strictly optional: if not connected, silently skips without throwing.
 * 2. Notification failures NEVER break medication functionality or block user flow.
 * 3. Never claims medication was "not taken" when confirmation is unknown.
 */
export async function notifyGuardian(
  payload: GuardianNotificationPayload
): Promise<GuardianNotificationResult> {
  const guardianLinkId = payload.guardianLinkId || getActiveGuardianLinkId();

  // If no guardian link is configured, gracefully skip
  if (!guardianLinkId) {
    console.log(
      `[GuardianNotifications] No guardian link ID configured for ${payload.type}. Silently skipping.`
    );
    return { ok: true, sent: false, skipped: true };
  }

  const seniorName = payload.seniorName || getSeniorName();

  const body: Record<string, unknown> = {
    guardianLinkId,
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
      `[GuardianNotifications] Dispatching '${payload.type}' for ${seniorName} to guardian ${guardianLinkId}...`
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
