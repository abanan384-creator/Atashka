# Senior Medication Assistant

A hackathon MVP for elderly users who struggle with complex digital interfaces and need a simpler way to follow medication schedules.

The product is intentionally designed around **minimal cognitive load**, **persistent reminders**, **clear voice guidance**, and an optional **family/caregiver safety layer**.

> Core principle: build the simplest possible medication experience for a user who should not need to learn how the app works.

---

## 1. Problem

Medication reminder apps often assume that users can comfortably navigate modern interfaces, understand small icons, manage settings, react to push notifications, and remember where features are located.

That assumption breaks down for many elderly users.

Typical problems:

- medication reminders are easy to miss;
- interfaces contain too many screens and controls;
- text and buttons are too small;
- notifications are easy to dismiss;
- medication schedules can be confusing;
- users may forget whether they already took a dose;
- family members may need visibility when no confirmation is received.

The goal is not to build the most feature-rich medication app.

The goal is to build the **clearest possible medication experience**.

---

## 2. Product concept

The product combines several proven interaction patterns:

- **Assistive Access-style simplicity**
- **persistent medication reminders**
- **voice/audio reminders**
- **caregiver escalation**
- **optional lightweight game**
- **offline-capable core reminder logic**

The key product idea is:

> Existing medication apps are usually feature-first. This product is senior-first.

---

## 3. Primary users

### Senior user

The primary interface is optimized for:

- elderly users;
- low digital literacy;
- reduced visual acuity;
- reduced motor precision;
- slower interaction speed;
- users who should not need onboarding to understand the main screen.

### Caregiver / family member

A secondary interface may allow a relative or caregiver to:

- configure medication schedules;
- add medication name and dosage;
- upload a medication photo;
- configure reminder times;
- receive alerts;
- review confirmations and missed confirmations;
- optionally configure voice reminders.

The senior-facing interface must remain dramatically simpler than the caregiver interface.

---

## 4. Current home screen

The home screen must contain only **three main actions**.

### 1. Take medication

Primary CTA.

Recommended current label:

**ПРИНЯТЬ ТАБЛЕТКИ**

This action opens the medication flow for the current or next scheduled dose.

### 2. Medication schedule

Label:

**РАСПИСАНИЕ ПРИЁМА ЛЕКАРСТВ**

The card/button must also show:

**Следующий приём: [time]**

Example:

```text
РАСПИСАНИЕ ПРИЁМА ЛЕКАРСТВ
Следующий приём: 18:30
```

### 3. Game

Label:

**ИГРА**

The game is a lightweight engagement feature.

It must never be treated as evidence that medication was taken.

---

## 5. Medication reminder flow

Example:

```text
Scheduled dose
      ↓
Reminder active
      ↓
User action?
  ↙         ↘
Taken      Snooze
  ↓          ↓
Confirmed   +5 min
               ↓
         Reminder again
```

Reminder screen example:

```text
Время принять лекарство

Метформин
1 таблетка

[ ПРИНЯЛ ]

[ НАПОМНИТЬ ЧЕРЕЗ 5 МИНУТ ]
```

### Fixed rule

Snooze duration is:

**5 minutes**

Do not silently change it to 10 minutes.

---

## 6. Safety rule

This rule is critical:

> **No response does not mean the medication was not taken.**

A user may take the medication and forget to press the confirmation button.

Therefore the application must never infer:

```text
no confirmation = definitely not taken
```

Instead:

```text
no confirmation = medication status unknown
```

Safe wording:

**Мы не получили подтверждение. Вы уже приняли лекарство?**

Unsafe wording:

**Вы не приняли лекарство. Примите его сейчас.**

The application must not encourage a second dose when the actual medication status is uncertain.

---

## 7. Game priority rules

Medication interactions always have higher priority than the game.

Rules:

1. The game does not confirm medication intake.
2. Medication timers continue while the game is open.
3. If a medication reminder becomes active during a game, the reminder takes over.
4. The game should pause or close.
5. The user is shown the reminder screen.
6. The user may return to the game after the medication interaction is resolved.

Priority order:

```text
1. Medication reminder
2. Medication safety interaction
3. Schedule
4. Caregiver communication
5. Game
```

---

## 8. Voice and audio

Audio reminders are part of the product concept.

Possible reminder:

**«Время принять лекарство».**

Possible snooze response:

**«Хорошо, напомню через 5 минут».**

Possible repeated reminder:

**«Мы не получили подтверждение. Вы уже приняли лекарство?»**

The current voice reference discussed for prototyping is an ElevenLabs voice:

**Kristen — Natural, Upbeat and Focused**

Voice requirements:

- clear Russian pronunciation;
- calm tone;
- short phrases;
- no long AI monologues;
- no guilt or pressure;
- no medical advice.

---

## 9. Open decisions

The following are intentionally **not finalized**:

- voice answer vs large `ДА / НЕТ` buttons;
- whether an AI voice agent is triggered automatically after no response;
- exact number of reminder cycles before escalation;
- exact caregiver escalation timing;
- whether caregiver alerts are push, SMS, call, or another channel;
- final wording of some reminder messages;
- final caregiver-side feature set.

Do not treat these as already decided.

---

## 10. Accessibility requirements

Accessibility is a core requirement, not a later enhancement.

### Interface

- very large buttons;
- very large text;
- strong contrast;
- minimal screen density;
- no hamburger menu;
- no hidden gestures;
- no small close icons;
- no tiny secondary controls;
- no complicated onboarding;
- no dashboard clutter;
- no critical information conveyed by color alone.

### Interaction

- large hit targets;
- simple transitions;
- clear feedback after every tap;
- no accidental destructive actions;
- medication state should always be obvious.

---

## 11. Visual direction

The visual quality should feel modern and premium while preserving extreme simplicity.

Reference direction:

**Assistive Access usability + Awwwards-level polish**

Desired qualities:

- calm;
- warm;
- premium;
- trustworthy;
- spacious;
- readable;
- tactile;
- highly accessible.

Allowed:

- subtle gradients;
- large rounded cards;
- soft shadows;
- premium microinteractions;
- gentle transitions;
- strong typography hierarchy.

Avoid:

- cyberpunk;
- dark sci-fi interfaces;
- dashboard-heavy layouts;
- hospital enterprise software look;
- childish visuals;
- over-animation;
- visual complexity for its own sake.

---

## 12. Core MVP

The hackathon MVP should demonstrate:

1. Home screen with three primary actions.
2. Medication schedule.
3. Next medication time.
4. Medication reminder screen.
5. Audio reminder.
6. `ПРИНЯЛ` confirmation.
7. `НАПОМНИТЬ ЧЕРЕЗ 5 МИНУТ`.
8. Repeated reminder state.
9. Mini-game.
10. Medication reminder interrupting the game.
11. Persistent local reminder logic.
12. Clear state handling for confirmed / snoozed / unknown.
13. Optional basic caregiver escalation demo if time permits.

---

## 13. Suggested data model

### Medication

```ts
type Medication = {
  id: string
  name: string
  dosage: string
  imageUrl?: string
  instructions?: string
}
```

### MedicationSchedule

```ts
type MedicationSchedule = {
  id: string
  medicationId: string
  times: string[]
  active: boolean
}
```

### MedicationEvent

```ts
type MedicationEventStatus =
  | "scheduled"
  | "reminder_active"
  | "snoozed"
  | "confirmed_taken"
  | "confirmation_unknown"
  | "escalated"

type MedicationEvent = {
  id: string
  medicationId: string
  scheduledAt: string
  status: MedicationEventStatus
  snoozedUntil?: string
  confirmedAt?: string
}
```

Important:

`confirmation_unknown` must remain distinct from `confirmed_taken`.

---

## 14. State machine

Recommended core logic:

```text
SCHEDULED
   ↓
REMINDER_ACTIVE
   ├── user confirms → CONFIRMED_TAKEN
   ├── user snoozes → SNOOZED
   │                     ↓
   │                 +5 minutes
   │                     ↓
   │              REMINDER_ACTIVE
   │
   └── no response → CONFIRMATION_UNKNOWN
                           ↓
                     escalation flow
```

Do not collapse `CONFIRMATION_UNKNOWN` into `NOT_TAKEN`.

---

## 15. Offline-first principle

Critical medication reminder features should not depend completely on internet connectivity.

Prefer local capability for:

- medication schedule;
- reminder timer;
- reminder screen;
- snooze;
- intake confirmation;
- local event state.

Cloud services may be used for:

- caregiver sync;
- caregiver alerts;
- remote configuration;
- AI voice;
- analytics.

The medication reminder itself must remain useful when the network is unavailable.

---

## 16. Non-goals

This product is **not**:

- a doctor;
- a medication prescribing system;
- a diagnostic system;
- a dose adjustment engine;
- a hospital information system;
- an AI medical chatbot.

Do not add:

- diagnosis;
- dosage recommendations;
- double-dose advice;
- medical treatment decisions;
- blockchain;
- social feed;
- leaderboard;
- complex analytics for seniors;
- unnecessary AI features;
- extra navigation tabs without a clear reason.

---

## 17. Success criteria

The MVP is successful if a new senior user can understand the core flow with almost no explanation.

Key UX questions:

- Can the user identify the next medication time?
- Can the user start the medication flow?
- Can the user confirm intake?
- Can the user snooze the reminder?
- Can the user understand a repeated reminder?
- Can the user distinguish the game from medication actions?
- Can the user complete the main flow without help?

---

## 18. Development principle

For every new feature, ask:

> Does this make it easier for an elderly user to complete the medication task?

If the answer is no, the feature probably does not belong in the senior interface.

