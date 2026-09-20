/**
 * Centralized configuration & constants
 * Strictly enforces AGENTS.md locked product rules.
 */

// Locked Product Rule #4: Snooze interval is exactly 5 minutes
export const REMINDER_SNOOZE_MINUTES = 5;

// Hackathon Demo Mode: Isolated demo accelerated snooze in seconds
export const DEMO_ACCELERATED_SNOOZE_SECONDS = 6;

// LocalStorage Persistence Keys
export const STORAGE_KEYS = {
  USER_PROFILE: "sma_user_profile_v2",
  PRESCRIPTION_SCAN: "sma_prescription_scan_v2",
  MEDICATIONS: "sma_medications_v2",
  SCHEDULES: "sma_schedules_v2",
  EVENTS: "sma_events_v2",
  ACTIVE_EVENT_ID: "sma_active_event_id_v2",
  DEMO_MODE_ENABLED: "sma_demo_mode_v2",
  AUDIO_ENABLED: "sma_audio_enabled_v2",
  GAME_STATE: "sma_game_state_v2",
  CAREGIVER_INFO: "sma_caregiver_info_v1",
  USER_REGISTERED: "sma_user_registered_v1",
} as const;

// Audio guidance phrases
export const AUDIO_PHRASES = {
  NAME_PROMPT: "Как вас зовут? Введите ваше имя и нажмите кнопку Продолжить.",
  SCAN_PROMPT: "Сфотографируйте лист с назначенными лекарствами.",
  ANALYZING: "Читаем ваши назначения. Это займёт несколько секунд.",
  VERIFY_PROMPT: "Мы нашли ваши лекарства. Проверьте информацию и нажмите Всё верно.",
  SUCCESS_PROMPT: "Готово! Мы добавили ваши лекарства и будем напоминать о каждом приёме.",
  REMINDER_PROMPT: "Пора принять лекарство.",
  SNOOZE_CONFIRMATION: "Хорошо, напомню через пять минут.",
  REPEATED_REMINDER: "Мы не получили подтверждение. Вы уже приняли лекарство?",
  MEDICATION_TAKEN: "Приём подтверждён. Будьте здоровы!",
  AI_CALL_PROMPT: "Мы не получили подтверждение. Вы уже приняли лекарство?",
} as const;
