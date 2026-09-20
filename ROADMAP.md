# ROADMAP.md

## Senior Medication Assistant — Hackathon Roadmap

This roadmap prioritizes a reliable end-to-end demo over feature quantity.

The goal is not to finish every possible feature. The goal is to make the core flow feel complete, safe, obvious, and polished.

---

# Phase 0 — Project foundation

## Goal

Establish the app shell and remove architectural ambiguity.

## Tasks

- inspect existing repository;
- identify framework and build tooling;
- confirm local development command;
- ensure app boots cleanly;
- create shared design tokens;
- create app-level state structure;
- create medication domain types;
- create mock medication data;
- add persistence layer;
- add centralized reminder constants;
- add demo mode configuration.

## Deliverable

The project runs locally with no blocking errors and has a stable foundation for the core flow.

## Exit criteria

- app starts successfully;
- no console-blocking errors;
- medication domain types exist;
- data persists locally;
- reminder timing is centralized.

---

# Phase 1 — Home screen

## Goal

Build the senior-facing entry screen.

## Required UI

Exactly three large primary actions:

### 1. `ПРИНЯТЬ ТАБЛЕТКИ`

Primary visual CTA.

### 2. `РАСПИСАНИЕ ПРИЁМА ЛЕКАРСТВ`

Includes:

`Следующий приём: [time]`

### 3. `ИГРА`

Optional engagement feature.

## Design requirements

- Assistive Access-level simplicity;
- Awwwards-level polish;
- extremely large touch targets;
- high contrast;
- responsive layout;
- no sidebar;
- no bottom navigation;
- no dashboard clutter.

## Exit criteria

A first-time user understands all three actions without instruction.

---

# Phase 2 — Medication schedule

## Goal

Make medication timing understandable at a glance.

## Tasks

- build schedule screen;
- show chronological medication times;
- show medication name;
- show dosage;
- support current day;
- identify next scheduled dose;
- return cleanly to home;
- use very large readable rows/cards.

## Example

```text
Сегодня

08:00
Метформин
1 таблетка

13:00
Лекарство B
1 таблетка

18:30
Лекарство C
1 таблетка
```

## Exit criteria

The next medication time is obvious within seconds.

---

# Phase 3 — Core reminder engine

## Goal

Implement deterministic medication reminder state.

## Tasks

- create medication event state machine;
- schedule reminder activation;
- support `reminder_active`;
- support `confirmed_taken`;
- support `snoozed`;
- support `confirmation_unknown`;
- persist state;
- restore state after refresh;
- keep time handling centralized.

## Required state distinction

```text
no response != not taken
```

## Exit criteria

Reminder logic works independently of UI polish.

---

# Phase 4 — Reminder screen

## Goal

Create the most important interaction in the product.

## Required content

- `Время принять лекарство`;
- medication name;
- dosage;
- optional image;
- primary `ПРИНЯЛ`;
- secondary `НАПОМНИТЬ ЧЕРЕЗ 5 МИНУТ`.

## Behavior

### `ПРИНЯЛ`

- marks event `confirmed_taken`;
- stores confirmation timestamp;
- closes reminder;
- updates schedule state.

### `НАПОМНИТЬ ЧЕРЕЗ 5 МИНУТ`

- sets event `snoozed`;
- schedules reminder exactly 5 minutes later;
- closes active reminder;
- optionally plays:
  `Хорошо, напомню через 5 минут`.

## Exit criteria

The core medication flow can be demonstrated end-to-end.

---

# Phase 5 — Repeat reminder

## Goal

Handle unresolved reminders safely.

## Tasks

- reactivate reminder after snooze;
- create repeated reminder UI;
- never assume medication was not taken;
- use safe copy;
- support `confirmation_unknown`.

## Recommended message

`Мы не получили подтверждение. Вы уже приняли лекарство?`

## Open decision

Interaction may later be:

- large `ДА / НЕТ` buttons;
- voice input;
- AI voice agent.

Do not lock this prematurely.

## Exit criteria

The repeated reminder state is safe and understandable.

---

# Phase 6 — Audio / voice

## Goal

Make reminders noticeable and human.

## Tasks

- add reminder sound;
- add optional TTS or prerecorded speech;
- support short phrases;
- ensure audio does not block UI;
- add mute-safe fallback via visual reminder.

## Candidate phrases

- `Время принять лекарство.`
- `Хорошо, напомню через 5 минут.`
- `Мы не получили подтверждение.`

## External prototype reference

ElevenLabs voice discussed:

`Kristen — Natural, Upbeat and Focused`

## Exit criteria

The reminder remains understandable with audio on or off.

---

# Phase 7 — Mini-game

## Goal

Implement the third home action without compromising medication safety.

## Recommended MVP

Choose one simple interaction that can be completed in under 1–2 minutes.

Examples:

- match pairs;
- remember a short sequence;
- identify the different symbol;
- simple number ordering.

Do not claim medical or cognitive improvement.

## Mandatory interruption behavior

If a medication reminder becomes active:

1. pause/close the game;
2. store game state if needed;
3. show medication reminder;
4. resolve medication interaction first;
5. optionally allow game resume.

## Exit criteria

Medication reminder reliably preempts game state.

---

# Phase 8 — Caregiver layer

## Goal

Demonstrate family safety support.

## MVP options

Build only what is needed for demo:

- caregiver contact;
- notification preview;
- unconfirmed medication event;
- simple caregiver status screen.

## Potential future features

- remote medication setup;
- confirmation history;
- missed confirmation alerts;
- voice recording;
- medication photo upload.

## Open decisions

- escalation timing;
- number of reminder cycles;
- notification channel;
- whether AI voice call happens before caregiver alert.

## Exit criteria

The demo can explain how family support fits into the system without overbuilding.

---

# Phase 9 — Demo mode

## Goal

Make the entire flow demoable in minutes.

## Tasks

- add development-only accelerated time;
- keep real product snooze value at 5 minutes;
- isolate demo multiplier;
- add quick test medication event;
- expose a safe developer control or fixture.

## Important

Do not rewrite product logic around seconds.

The product rule remains:

**5-minute snooze**

## Exit criteria

A reviewer can see:

home → schedule → reminder → snooze → repeated reminder → confirmation

without waiting five real minutes.

---

# Phase 10 — Accessibility pass

## Goal

Ensure the product works for its actual audience.

## Checklist

- large text;
- large hit targets;
- clear focus states;
- strong contrast;
- visible state changes;
- no hover-only actions;
- no tiny icons;
- no hidden navigation;
- no unnecessary scrolling;
- screen reader labels where relevant;
- test at 200% zoom;
- test with reduced motion;
- test keyboard navigation.

## Exit criteria

The app remains usable when visual precision and interaction speed are reduced.

---

# Phase 11 — Visual polish

## Goal

Raise visual quality without increasing cognitive complexity.

## Tasks

- refine spacing;
- refine typography;
- add subtle transitions;
- improve button hierarchy;
- improve card depth;
- polish empty/loading states;
- keep motion restrained;
- ensure responsive layout;
- remove generic template styling.

## Desired feel

- calm;
- premium;
- warm;
- modern;
- safe;
- human.

## Exit criteria

The app feels intentional and presentation-ready, not like a default component library demo.

---

# Phase 12 — QA and demo hardening

## Goal

Make the live hackathon demo difficult to break.

## Test flows

### Flow A — normal confirmation

Home  
→ medication reminder  
→ `ПРИНЯЛ`  
→ confirmation stored

### Flow B — snooze

Reminder  
→ `НАПОМНИТЬ ЧЕРЕЗ 5 МИНУТ`  
→ reminder returns  
→ confirm

### Flow C — game interruption

Open game  
→ reminder activates  
→ game interrupted  
→ reminder shown

### Flow D — refresh

Schedule/reminder state  
→ refresh app  
→ state restored

### Flow E — offline

Disable network  
→ local schedule still visible  
→ local reminder logic still works

## Exit criteria

The full demo works multiple times consecutively without manual fixes.

---

# Post-hackathon roadmap

Only after the hackathon MVP is stable:

- production caregiver accounts;
- remote medication management;
- push notifications;
- SMS/call escalation;
- secure authentication;
- encrypted cloud sync;
- audit logs;
- multi-medication conflict handling;
- localization;
- voice personalization;
- production mobile app;
- clinical/legal review;
- privacy and consent flows;
- accessibility testing with real senior users;
- real-world adherence study.

---

# Final priority order

If time becomes limited, build in this order:

1. Home screen
2. Schedule
3. Reminder state machine
4. Reminder screen
5. 5-minute snooze
6. Repeated reminder
7. Persistence
8. Audio
9. Game interruption
10. Demo mode
11. Accessibility polish
12. Caregiver demo
13. AI voice features

Never sacrifice the working medication flow for optional AI or visual effects.
