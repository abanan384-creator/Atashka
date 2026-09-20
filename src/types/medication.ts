/**
 * Domain types for Senior Medication Assistant
 * Follows AGENTS.md, README.md, and new product specification.
 */

export type RelationToFood = "before_food" | "after_food" | "with_food" | "unknown";

export type MedicationEventStatus =
  | "scheduled"
  | "reminder_active"
  | "snoozed"
  | "confirmed_taken"
  | "confirmation_unknown";

export interface LocalUserProfile {
  id: string;
  name: string;
  createdAt: string;
  onboardingCompleted: boolean;
}

export interface ParsedMedication {
  name: string;
  dosage?: string;
  amount?: string;
  times: string[]; // e.g. ["08:00", "20:00"]
  frequency?: string;
  relationToFood?: RelationToFood;
  instructions?: string;
  confidence?: number;
}

export interface PrescriptionScan {
  id: string;
  imageReference?: string;
  parsedMedications: ParsedMedication[];
  confirmed: boolean;
  createdAt: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  relationToFood?: RelationToFood;
  imageUrl?: string;
  instructions?: string;
  color?: string;
}

export interface MedicationSchedule {
  id: string;
  medicationId: string;
  times: string[]; // "08:00", "13:00", "20:00"
  active: boolean;
}

export interface MedicationEvent {
  id: string;
  medicationId: string;
  scheduledAt: string; // ISO string for dose date-time
  timeString: string; // "08:00", "13:00", etc. for display
  status: MedicationEventStatus;
  snoozedUntil?: string; // ISO string when snoozed
  confirmedAt?: string; // ISO string when confirmed
  cycleCount: number; // number of snoozes / reminders
  isRepeatedReminder?: boolean; // true if reactivated after snooze/no confirmation
}

export type ActiveScreen =
  | "onboarding_name"
  | "onboarding_scan"
  | "onboarding_review"
  | "onboarding_success"
  | "home"
  | "schedule"
  | "game"
  | "register"
  | "caregiver";
