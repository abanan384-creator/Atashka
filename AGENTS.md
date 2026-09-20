# AGENTS.md

This file defines mandatory rules for any coding agent working on this repository.

The project is a hackathon MVP for a **senior-first medication assistant**.

Do not treat this as a generic health dashboard.

---

## 1. Product objective

Build an ultra-simple medication reminder experience for elderly users with low digital literacy.

The senior-facing interface must prioritize:

- clarity;
- accessibility;
- reliability;
- medication safety;
- very low cognitive load.

Do not add complexity simply because it looks impressive.

---

## 2. Source of truth

The following files are authoritative:

1. `AGENTS.md`
2. `README.md`
3. `ROADMAP.md`

If implementation conflicts with these files, stop and fix the implementation.

Do not silently reinterpret product rules.

---

## 3. Locked product rules

These requirements are considered fixed unless the human explicitly changes them.

### Home screen

Exactly three primary actions:

1. `ПРИНЯТЬ ТАБЛЕТКИ`
2. `РАСПИСАНИЕ ПРИЁМА ЛЕКАРСТВ`
   - must display `Следующий приём: [time]`
3. `ИГРА`

Do not replace the home screen with a dashboard.

Do not add sidebars, bottom navigation, dense widgets, charts, or extra primary actions.

---

## 4. Reminder rules

Medication reminder flow must support:

- medication name;
- dosage;
- optional medication image;
- `ПРИНЯЛ`;
- `НАПОМНИТЬ ЧЕРЕЗ 5 МИНУТ`;
- repeated reminder after snooze;
- unknown state when no confirmation exists.

Snooze interval is exactly:

**5 minutes**

Do not change it without explicit instruction.

---

## 5. Medication safety rule

Never infer that medication was not taken solely because the user did not confirm.

Mandatory semantic distinction:

```text
no response != not taken
```

Use:

```text
confirmation_unknown
```

Do not use:

```text
not_taken
```

unless a future explicit product requirement introduces a safe, verified way to know that state.

Never generate UI copy that encourages a second dose when the medication status is uncertain.

Preferred repeated reminder wording:

**Мы не получили подтверждение. Вы уже приняли лекарство?**

---

## 6. Game behavior

The game is always lower priority than medication.

Mandatory behavior:

- game does not confirm medication intake;
- reminder timer continues while game is active;
- reminder interrupts game;
- game pauses or closes when reminder becomes active;
- user is returned to medication flow;
- user may resume game later.

Never allow the game to suppress or delay a medication reminder.

---

## 7. Accessibility rules

Treat accessibility as a hard requirement.

### Required

- large tap targets;
- large readable text;
- high contrast;
- obvious primary action;
- minimal visual density;
- simple navigation;
- clear state transitions;
- keyboard accessibility where applicable;
- proper semantic HTML;
- ARIA only when semantic HTML is insufficient;
- visible focus states;
- no information conveyed by color alone.

### Forbidden

- tiny icon-only actions;
- hidden gestures;
- hover-only critical interactions;
- hamburger navigation for primary flows;
- small modals with critical information;
- dense data tables for the senior interface;
- multi-step onboarding before the user can see the main actions.

---

## 8. Visual quality

Target:

**Assistive Access simplicity + Awwwards-level polish**

Do not interpret Awwwards as permission to build an unusable art experiment.

Prefer:

- strong whitespace;
- premium typography;
- large rounded surfaces;
- subtle animation;
- calm transitions;
- restrained depth;
- warm, trustworthy feel.

Avoid:

- excessive glassmorphism;
- cyberpunk;
- neon-heavy visuals;
- excessive motion;
- complex 3D;
- decorative effects that reduce readability.

---

## 9. Engineering priorities

Order of priority:

1. medication safety;
2. reminder reliability;
3. accessibility;
4. correct state management;
5. simple UX;
6. visual polish;
7. game;
8. optional AI features.

Never sacrifice the first five for visual effects.

---

## 10. State model

Prefer an explicit state machine rather than scattered booleans.

Recommended states:

```ts
type MedicationEventStatus =
  | "scheduled"
  | "reminder_active"
  | "snoozed"
  | "confirmed_taken"
  | "confirmation_unknown"
  | "escalated"
```

Avoid state combinations such as:

```ts
isTaken
isSnoozed
isMissed
isReminderOpen
```

that can become contradictory.

---

## 11. Persistence

Core medication schedule and reminder state must survive page refresh / app restart during the hackathon demo.

Use a persistence layer suitable for the current stack.

For a browser-first MVP, acceptable early choices include:

- localStorage;
- IndexedDB;
- persisted local state.

If a backend already exists, integrate with it rather than duplicating state.

---

## 12. Offline-first behavior

Core reminder functionality should remain usable without network access.

Do not make these depend entirely on external APIs:

- schedule display;
- reminder timing;
- snooze;
- confirmation;
- local event status.

External services may enhance:

- text-to-speech;
- caregiver notification;
- remote configuration;
- analytics.

---

## 13. AI rules

Do not add AI unless it clearly reduces user effort.

AI must not:

- prescribe medication;
- change dosage;
- diagnose;
- infer medical conditions;
- advise double dosing;
- decide treatment.

Possible AI uses:

- voice interaction;
- caregiver summary;
- natural-language configuration on caregiver side.

All medical action logic remains deterministic.

---

## 14. Open decisions

Do not silently resolve these:

- voice response vs `ДА / НЕТ` buttons;
- automatic AI voice call after no response;
- number of repeated reminder cycles;
- exact caregiver escalation timing;
- caregiver notification channel;
- final AI agent conversation.

If implementation needs one of these, create a safe placeholder and mark it clearly.

---

## 15. Code quality expectations

When modifying the project:

- inspect the existing architecture first;
- reuse existing patterns where sensible;
- avoid unnecessary rewrites;
- keep components small and comprehensible;
- keep domain logic separate from presentation logic;
- write deterministic reminder logic;
- validate time and date handling;
- avoid timezone assumptions;
- document non-obvious logic;
- remove dead code;
- do not leave broken placeholders in primary demo paths.

---

## 16. Testing expectations

At minimum test:

### Reminder logic

- scheduled reminder activates;
- confirm changes state to `confirmed_taken`;
- snooze schedules exactly +5 minutes;
- repeated reminder activates;
- no response never becomes `confirmed_taken`;
- no response never becomes verified `not_taken`.

### Game interruption

- game opens;
- reminder becomes active;
- game is interrupted;
- reminder screen has priority;
- game state can be resumed if implemented.

### Persistence

- schedule survives refresh;
- reminder state survives refresh where appropriate;
- confirmation remains stored.

### Accessibility

- primary actions are keyboard reachable;
- buttons have clear accessible labels;
- focus order is logical.

---

## 17. Demo mode

A hackathon demo may use a development-only accelerated clock so reviewers do not literally wait five minutes.

If implementing demo mode:

- production logic must still represent a 5-minute snooze;
- demo acceleration must be clearly isolated;
- do not hardcode fake timing throughout the app;
- expose one development constant or demo configuration.

Example:

```ts
const REMINDER_SNOOZE_MINUTES = 5
const DEMO_TIME_MULTIPLIER = ...
```

Do not change the product requirement to “5 seconds”.

---

## 18. Before completing a task

Check:

- Did I preserve exactly three primary home actions?
- Did I preserve the 5-minute snooze?
- Did I keep game priority below medication?
- Did I preserve `no response != not taken`?
- Did I avoid adding medical advice?
- Did I keep the senior interface simple?
- Did I avoid inventing decisions that are still open?
- Does the main demo path actually work?

If any answer is no, fix it before considering the task complete.

