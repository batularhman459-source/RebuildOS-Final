# RebuildOS — Product Brief (V1 / MVP)

_Status: V1 built. **V1.1 direction below supersedes the rest of this document where they differ.** This document is the reference for user journeys, design, and implementation. If something here turns out to be wrong, change this document first._

---

## V1.1 direction (after testing V1 on an iPhone 15 Pro)

**What testing showed:** colours and layout fit well, but motion felt choppy and cheap; the install prompt was confusing and blocking; the app felt **empty, abstract and not helpful enough**. Its vocabulary (Missions, Actions, Later, Main Action) had to be learned, there were no dates, it wasn't clear where to put what, and "Make today smaller" asked too many questions on exactly the days with the least energy.

**What the user wants RebuildOS to do:**
1. Tell me **what to work on next**.
2. Show **how I'm progressing towards my goals**.
3. Help me **keep good habits** and stay on track.
4. Let my day flex: a guided day, a "just my list" day, or **the minimum on bad days** so nothing fully breaks.

**Decisions:**

| Topic | Decision |
|---|---|
| Vocabulary | **Goals, Tasks, Habits** in plain words. "Rebuild" stays as the app name and the bad-day mode. |
| Adding a task | One field, then simple options: **When** (Today · Tomorrow · Pick a date, optional time), **Repeat**, **Goal**. |
| Dates | A task with a date appears on Today by itself on that day. |
| Times | **For ordering the day only.** No reminders until the App Store version (web push on iPhone is unreliable). |
| Habits | Both **every day** and **X times a week**. Shown on Today; weekly dots on Progress. A missed day is an empty dot, never a broken streak. |
| Goals | Optional measurable target (e.g. "Run 21 km", "Save €2,000") with a real progress bar; otherwise "5 of 8 steps done". **Focus time per goal stays** — it's useful. |
| Bad days | **"My minimum day"**, set once during setup; one tap on a bad day, no choosing or swapping. |
| First use | A ~60-second setup (goal with template steps, one or two habits, my minimum) so the app is never empty. |
| Today | The one thing to do next at the top, then **Habits today**, then **Tasks**. The app suggests the next thing from dated tasks and goals' next steps; the user can always override. |
| Install | **Never blocking.** One clear, closable prompt with a visual; outside Safari on iPhone, "Open in Safari" with Copy link. |
| AI | Later, once the app proves itself. Templates now, built so AI suggestions can slot in. |

**Plan:**

| Phase | Scope |
|---|---|
| 1 | Motion and performance on iPhone; install prompt rework — **done** |
| 2 | Plain words; simpler add sheet with dates and times; simplified Today — **done** |
| 3 | Habits; My minimum day — **done** |
| 4 | Goal progress; first-time setup with templates — **done** |

Each phase is checked on a real iPhone before the next starts.

---

## 1. What RebuildOS is

RebuildOS is a personal execution and recovery app for **young people trying to build a better life**.

It closes the gap between *intending* to do something and *doing* it — and makes it cheap to come back after drifting.

Most productivity tools are designed for the user on a good day. RebuildOS is designed to work on the good days **and** the bad weeks.

**Core loop:** Mission → Action → Today → Focus → Done → Progress
**Recovery loop:** Return / hard day → Rebuild (a smaller day) → Progress → Normal day

**Positioning:** _The productivity app that never makes you feel behind._

### Success measure
A great session can be 30 seconds of planning followed by an hour of real work outside the app. We do not optimise for time-in-app.

---

## 2. Who it's for

**Audience:** young people (students, young professionals, early founders, creators) trying to build a better life.

**Design reference user** (used to break ties between design choices):
> Someone with 1–3 self-directed goals that nobody else holds them accountable for — an exam weeks away, a side project, getting fit, fixing their sleep. They know what they want, struggle to act on it consistently, and sometimes fall off completely.

Implications:
- Missions are personal, not corporate ("Get fit" is as valid as "Launch my app").
- Missions stay light. We do not build project management for teams.
- Someone who has never used a productivity app must understand it immediately.

**Tone:** warm, direct, never preachy. A friend who has their life together and doesn't make you feel bad about yours. No hustle quotes, no therapist voice, no guilt.

---

## 3. Product principles

1. **Clarity over complexity.**
2. **Execution over organisation.** Planning exists to start action.
3. **Progress over perfection.** Nothing ever resets. Missed days invalidate nothing.
4. **Simple by default, depth when needed.**
5. **Honest feedback, no gamification.** Show real units (time, Actions), never invented points.
6. **Quality over quantity.** Fewer systems, built exceptionally well.
7. **Real usability over mockups.** A feature is done when it works in a real day, not a screenshot.
8. **Never make the user feel behind.** No overdue, no streaks, no red, no "you missed X".

---

## 4. Systems

### 4.0 App structure
- **Three tabs:** `Today` · `Plan` · `Progress`.
  - **Today** — what to do now.
  - **Plan** — Missions (each showing its next Action) and Later Actions that don't belong to a Mission.
  - **Progress** — this week, the all-time record, and per-Mission investment.
- **Full-screen moments, not tabs:** Focus, Rebuild, Close the day, Welcome back.
- **A day starts at 04:00 local time**, not midnight, so late-night work belongs to the day it was part of.
- **Where you add decides where it goes:** adding from Today puts it on Today; adding from Plan or a Mission puts it in Later.

### 4.1 Actions — execution
The central unit of the app.

- **Required:** name only. Creating an Action takes seconds.
- **Optional:** Mission, estimated duration, target day.
- **States:** `Later` · `Today` · `Done`. **There is no Overdue state.**
- One Today Action can be the **Main Action**. The first Action added to an empty Today becomes the Main Action automatically; it can be changed in one tap.

**Overnight rule (at the start of a new day, 04:00):**
- The Main Action stays on Today.
- Other unfinished Today Actions quietly return to Later.
- Next morning Today shows one quiet line: _"3 Actions moved to Later"_ with one-tap undo.
- If the user did _Close the day_, their choices there apply instead.

### 4.2 Missions — direction
Larger goals that take days to months.

- **Fields:** name ("What are you building?"), optional _"You'll know it's done when…"_, optional target date.
- **Creation always asks one question:** _"What's the first step?"_ → creates the first Action.
- **Shows:** Actions done, Focus time invested, last worked on, and **its next open Action**. If there is no open Action, the Mission prompts for one.
- **Completion:** the user marks it complete. No calculated percentage (it is false precision and goes backwards as you plan more).
- **Recommended limit:** about 3 active Missions. Others can be parked, never deleted by the system.
- **Not in V1:** categories, priorities, sub-missions.

### 4.3 Today — daily clarity
Answers one question: **What should I do right now?**

- Main Action (prominent), other Today Actions, quick add.
- Entry point to Focus and to "Make today smaller" (Rebuild).
- **Completed Actions stay visible**, struck through, at the bottom of Today until the day ends. This is the day's evidence, without a stats card.
- **Empty Today** suggests the next Action of each active Mission; one tap puts it on Today.
- **Close the day** appears as a quiet row at the bottom of Today after 18:00, or once every Today Action is done. Never a pop-up or notification.
- **No** stats, cards, motivational text, or progress dashboards on Today.

### 4.4 Focus — attention
A dedicated, distraction-free timer bound to an Action.

- **Always tied to an Action.** Starting Focus with nothing selected asks for a name first, so every minute counts towards something.
- Start, pause, resume, finish.
- **Counts up**, with an optional target (25 / 50 / 90 min, or the Action's estimate). The target fills a ring; going past it is fine. No countdown that "runs out".
- Records **actual** focused time against the Action (separate from estimated duration).
- At the end: **"Done, or more to do?"** — Done completes the Action; More keeps it on Today with time logged.
- Timer must be **timestamp-based** (store start/pause times, derive elapsed) so a locked phone, backgrounded tab, or reload never corrupts time.
- Sessions running beyond 3 hours ask the user to confirm (catches forgotten timers).

### 4.5 Rebuild — recovery
**Rebuild is a kind of day, not a mode.** It ends on its own; the next morning the app asks once: _"Normal day, or another small one?"_

- **Up to three slots, pre-filled:**
  1. **One step forward** — the Main Action, or the next Action of the most recently active Mission.
  2. **Move your body** — default e.g. "10-minute walk".
  3. **Reset your space** — default e.g. "Clear your desk".
- Any slot can be swapped in one tap (own Action, suggestion, or new) or removed. A Rebuild day can be one thing.
- **Offered automatically** when the user returns after 3+ days away, or when most of yesterday's Today went untouched. Always available manually via "Make today smaller".
- The normal Today is hidden for the day, never deleted, and is one tap away.
- **A small day has no score.** Items are ticked off, but nothing says "2 of 3".
- No Rebuild settings screen in V1.

### 4.6 Close the day — reflection (optional)
Replaces the separate Daily Check-in. About 30 seconds, entirely optional.

1. See what you did today (this is where progress feedback lives).
2. Decide where unfinished Actions go: tomorrow or Later.
3. Pick tomorrow's Main Action.
4. Optional one-tap energy level.

No free-text journaling in V1.

### 4.7 Progress — honest measurement
Only these numbers exist in V1, with exact definitions:

| Measure | Definition |
|---|---|
| Focus time | Sum of logged Focus session time, excluding pauses. |
| Actions completed | Count of Actions marked Done. |
| Active day | A day with ≥1 completed Action or ≥1 finished Focus session. |
| This week | Active days, Actions completed, and Focus time for the current week. |
| All-time record | Total Focus time and total Actions completed. **Never goes down.** |
| Mission investment | Per Mission: Actions done, Focus time, last worked on. |

Shown in Close the day and on a Progress screen — **not** on Today.

**Explicitly dropped:** Progress Points, Rank, Momentum score, streaks, mission percentages.
**The four-point Rebuild star** is a brand mark and may visualise the week (e.g. filling as you show up). It is not a metric.

---

## 5. Key user journeys

**1. First run (≈60 seconds to first Action)**
Open → "What's one thing you want to get done today?" → it becomes the Main Action → Today, with Start Focus as the obvious next tap. No sign-up, no Mission required, no tour. Later: a gentle "Got bigger goals? Add a Mission."

**2. A normal day**
Morning: Main Action carried over, a few Actions, at most one quiet line about Actions moved to Later. Tap Main Action → Focus → "Done, or more to do?" Evening (optional): Close the day.

**3. A hard day**
Today feels like too much → "Make today smaller" → three pre-filled slots → swap or remove → do one, two, or three. It counts as an active day. No "you only did 2/7". Next morning: "Normal day, or another small one?"

**4. Coming back after three weeks**
"Welcome back." No list of misses, no red. Missions and Actions are where they were left; Today is clean; the all-time record is untouched. "Start with a small day?" → Rebuild with slot 1 pre-filled from the top Mission's next Action. Working again within two taps.

**5. Creating a Mission**
"What are you building?" → optional "You'll know it's done when…" and target date → **"What's the first step?"** (creates the first Action, can go straight to Today). No setup screens.

---

## 6. Platform (MVP)

- **Web app first**, installable to the home screen (PWA). App Store packaging later, if it proves itself.
- **Install flow:** usable in the browser immediately so the first Action happens without friction. Install is prompted at a moment that earns it (e.g. after the first Focus session), with a short illustrated guide per platform (iOS has no native install prompt). After a session or two, the app requires installation to continue.
- **Notifications:** a bonus, not a foundation. iOS web push only works once installed. No core flow depends on a notification.
- **Interface** avoids web-only patterns so later native packaging is a wrapper, not a rewrite.

---

## 7. V1 scope

**In**
- Actions (name-only creation; Later / Today / Done; Main Action; overnight rule)
- Missions (light; next Action always visible; user-declared completion)
- Today
- Focus (timestamp-based, done/more-to-do ending)
- Rebuild (auto-offered and manual; three swappable slots)
- Close the day (optional)
- Progress (the measures in 4.7 only)
- Installable web app with guided install

**Postponed**
- Accounts, login, cloud sync (see open risks)
- Recurring Actions / habits — the first post-V1 decision
- Categories, priorities, tags, subtasks, templates
- Calendar integration
- Stats dashboards and insights
- Social features
- AI (most plausible future use: suggesting a first Action for a new Mission)
- Rebuild customisation settings, journaling

---

## 8. Open risks & deferred decisions

- **Data durability without accounts.** MVP stores data on-device. Safari can clear storage for sites not visited for ~7 days; home-screen-installed apps are exempt. Requiring install mitigates this, and the app should request persistent storage. A simple export/backup is a cheap safety net if needed before accounts arrive. The promise "your progress is never lost" must stay true — this is revisited before any public launch.
- **Overnight rule trade-off.** Someone who planned five Actions and skipped Close the day must pull four back from Later. Validate with real use.
- **Rebuild trigger thresholds** (3+ days away, "most of Today untouched") are initial guesses to be tuned.
- **Monetisation** is undecided. Recovery features should never be paywalled.

---

## 9. Next steps

1. ~~Low-fidelity flows for the five journeys~~ — done: `docs/wireframes/journeys.html`.
2. ~~Visual direction and a small design system~~ — done: `DESIGN.md` ("light for planning, dark for doing").
3. ~~Technical architecture for the MVP~~ — done: `docs/architecture.md`.
4. Build the MVP — in progress (see the build plan in `docs/architecture.md`).
