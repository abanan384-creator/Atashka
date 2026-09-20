import type { Medication, MedicationEvent } from "../types/medication";

export const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: "med-1",
    name: "Метформин",
    dosage: "1 таблетка (500 мг)",
    instructions: "После еды, запить чистой водой",
    color: "#2563EB", // Trusted medical blue
  },
  {
    id: "med-2",
    name: "Амлодипин",
    dosage: "1 таблетка (5 мг)",
    instructions: "Для давления, не разжёвывая",
    color: "#059669", // Calm soothing emerald
  },
  {
    id: "med-3",
    name: "Кардиомагнил",
    dosage: "1 таблетка (75 мг)",
    instructions: "Вечером после ужина",
    color: "#D97706", // Warm amber
  },
];

export function createInitialTodayEvents(medications: Medication[]): MedicationEvent[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayDateStr = `${year}-${month}-${day}`;

  // Find next intake time relative to now for a dynamic realistic experience:
  // e.g., 08:00 (morning, already confirmed), 14:00 (day), 19:30 (evening)
  const morningTime = `${todayDateStr}T08:00:00`;
  const afternoonTime = `${todayDateStr}T14:00:00`;
  const eveningTime = `${todayDateStr}T19:30:00`;

  return [
    {
      id: "event-1",
      medicationId: medications[1]?.id || "med-2",
      scheduledAt: morningTime,
      timeString: "08:00",
      status: "confirmed_taken",
      confirmedAt: `${todayDateStr}T08:05:12`,
      cycleCount: 0,
    },
    {
      id: "event-2",
      medicationId: medications[0]?.id || "med-1",
      scheduledAt: afternoonTime,
      timeString: "14:00",
      status: "scheduled",
      cycleCount: 0,
    },
    {
      id: "event-3",
      medicationId: medications[2]?.id || "med-3",
      scheduledAt: eveningTime,
      timeString: "19:30",
      status: "scheduled",
      cycleCount: 0,
    },
  ];
}
