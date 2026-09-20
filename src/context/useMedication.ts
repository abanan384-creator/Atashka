import { createContext, useContext } from "react";
import type {
  Medication,
  MedicationEvent,
  ActiveScreen,
  LocalUserProfile,
  ParsedMedication,
} from "../types/medication";

export interface MedicationContextType {
  userProfile: LocalUserProfile | null;
  saveUserName: (name: string) => void;
  medications: Medication[];
  events: MedicationEvent[];
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;
  // Onboarding & Prescription scan state
  parsedMedications: ParsedMedication[];
  isAnalyzing: boolean;
  analysisError: string | null;
  uploadPrescriptionImage: (file: File | Blob | string) => Promise<void>;
  confirmExtractedSchedule: (confirmedMeds: ParsedMedication[]) => void;
  finishOnboarding: () => void;
  restartOnboarding: (toScanOnly?: boolean) => void;
  // Reminder & Engine state
  activeReminderEvent: MedicationEvent | null;
  nextMedicationInfo: { time: string; medicationName: string } | null;
  demoMode: boolean;
  setDemoMode: (val: boolean) => void;
  audioEnabled: boolean;
  setAudioEnabled: (val: boolean) => void;
  isSpeaking: boolean;
  speak: (text: string) => void;
  playClick: () => void;
  savedGameResumeState: boolean;
  // AI Call Experience
  aiCallEvent: MedicationEvent | null;
  triggerAICall: (eventId?: string) => void;
  dismissAICall: () => void;
  // Core Domain Actions
  openMedicationFlow: () => void;
  confirmMedicationTaken: (eventId: string) => void;
  snoozeMedicationReminder: (eventId: string) => void;
  triggerImmediateReminder: (eventId?: string) => void;
  resetAllData: () => void;
  dismissReminderModal: () => void;
}

export const MedicationContext = createContext<MedicationContextType | undefined>(undefined);

export const useMedication = (): MedicationContextType => {
  const context = useContext(MedicationContext);
  if (!context) {
    throw new Error("useMedication must be used within a MedicationProvider");
  }
  return context;
};
