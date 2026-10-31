# HANDOFF: where FNPH Raid is and what to do next

Read this first if you are an AI picking up this project (Antigravity, Codex, Claude, Copilot, Cursor). Then read `README.md` (architecture, deck format) and `AGENTS.md` (rules). Last updated 31 Oct 2026.

## 0. Ground rules

- **GitHub is the source of truth:** `https://github.com/Olemabu/fnph-raid` (private, branch `main`). Local copy: `C:\Users\USER\Downloads\fnph-raid-project\fnph-raid-project`. Run `git pull` before you start. Push after every finished step.
- **Build:** run `build.bat` on Windows (PowerShell port of the build script). Use `python build.py` where Python exists. Both write `dist/fnph-raid.html`. Commit the rebuilt `dist` file with the source.
- **Test URL:** `file:///C:/Users/USER/Downloads/fnph-raid-project/fnph-raid-project/dist/fnph-raid.html`
- **Single self-contained HTML.** No frameworks, no server, no external scripts. Keep the Radius Raid MIT credit.
- **Controller:** left stick moves, right stick turns (axis 5 = X, axis 2 = Y). Do not change it.
- **Medical accuracy:** content must follow ICD-11, NICE and Maudsley. If you are unsure of a fact, add `[CHECK]` to the teaching note rather than inventing it.
- **Work in small steps:** one feature, then build, test, commit and push. The last session stalled because it tried to do too much at once (see section 4).

## 1. The goal

The player is a psychiatry resident at FNPH Barnawa preparing for the NPMCN Part I psychiatry exam. He wants to **master the syllabus by concept**, and in particular the **OSCEs**, by playing a game that does not get boring.

## 2. Done so far (all pushed)

| Commit | What it did |
|---|---|
| `389ef21` | Initial import (Radius Raid fork, 13 stations on the FNPH map, deck, recall mode, mastery, gamepad) |
| `ee499d4` | Graphics: interceptor ship, 2.5D map depth and lighting, neon plasma weapons, "cyber" answer gunships |
| `f2f52f8` | "Mecha" overhaul: mobile-frame ship, tactical coordinate grid, hazard stripes, bloom lighting |
| `e78fc00` | Deck expanded to 645 lines, 15 stations, about 93 `Q:` items. Adds the clinical arc **Schizophrenia → Clozapine initiation (OSCE) → Clozapine neutropenia emergency** and OSCE stations (history and risk, explaining treatment, examination, capacity and communication) |

Current stations (in `src/deck.txt`): Main Gate, Car Park, Main Block, NE Wing, Pink Quad (schizophrenia), Clozapine Clinic (OSCE), Emergency Resus (OSCE/emergency), U-Block, Sports Field, West Courtyard, Long Red Ward, Round Huts, South Ward (OSCE), Courtyard Block (OSCE), SE Clinic (OSCE). Only the first 13 get map slots, so stations 14 and 15 need slots in `src/mapgeo.js`. Check this.

**Teaching design the player agreed to:** OSCEs are **embedded as the next stage** after the related syllabus station, then the route returns to the syllabus. Conditions chain into their complications (for example schizophrenia → clozapine → neutropenia).

## 3. The syllabus source

- Repository: `https://github.com/Olemabu/nebula-study` (local: `C:\Users\USER\Documents\nebula-study`). There is also a reader at `C:\Users\USER\Documents\nebula-study-reader`.
- Topics: `data/topics/*.js` (for example `mood.js`). OSCEs: `data/osce/stations.js`. Explanations: `data/why/*.js`.
- Each topic has a long **lecturer's note** and a **summary**. **Build the game from the summaries, not the long notes.** The player said the summaries are enough for long cases.
- **Teach by concept, not whole modules.** Each station covers a few related concepts.
- **Include all the MCQs** from nebula-study.
- Verify the medical content of everything you pull in (see the rules in section 0).

## 4. Next tasks, in order (the player's latest request, not started)

Do one task at a time. After each: build, play-test, commit and push.

### Task 1: Fix aiming (top priority, the player's main complaint)
The player says he often knows the answer but cannot land the shot on the option he means.

Relevant code in `src/raid.js`:
- `R.onMouseMove` (about line 811). The hover target only registers within `c.radius + 22` px of the carrier **centre**, and every mouse move clears `$.aimLock`.
- `$.Carrier` and `Carrier.prototype.render` (about lines 189 to 340). The answer text is drawn on a holographic plate set **away from** the carrier centre, so the player aims at the text and misses.
- `R.aimTarget` (line 356). Keys 1 to 4 lock on (line 822). Gamepad cycling is around line 828. `R.pollPad` is at line 837.

Suggested fix:
- Count the label plate's rectangle as part of the hit and hover area.
- When the cursor is near a carrier, snap aim to the nearest one (a magnetic aim-assist cone).
- Do not drop the lock on small mouse jitter.
- Show a clear lock reticle and the option number on each plate.

Warning: the last session got stuck **re-reading lines 185 to 205, 300 to 330 and 810 to 820 over and over without editing**. Read them once, then write the change.

### Task 2: Gated progression
On a wrong answer the player can move on to the next question. The **stage does not clear until every question in it has been answered correctly**: missed items go back into the queue. See `R.carrierDown` (line 481), the queue handling near line 417 (`R.queue`), and `stationCleared` (line 573).

### Task 3: Upgrades so it doesn't get boring
Upgrade the gun, bullets and enemies as stations are cleared and mastery grows. For example: spread shot, then piercing plasma, then homing rounds; tougher or shielded enemy waves in later stations. Tie upgrades to mastery, not just time played. Weapon definitions start from `vendor/radius-raid/definitions.js`, with patched copies in `src/hero.js` and `src/bullet.js`. Do not edit the vendor files: override them in `src/`.

### Task 4: Varied stage modes (large, do each as its own step)
The player wants some stages played differently:
- a 3D first-person shooter
- a "007" spy or stealth stage
- a racing stage

The engine is a **2D top-down canvas** shooter. Build each mode as a separate self-contained mini-mode in its own file (for example `src/mode-race.js`), entered from specific stations (OSCE or emergency stages are a natural fit). Use the same deck item format (`Q:`, `L:`, `S:`). Use pseudo-3D (raycast or Mode-7 style) on canvas: no WebGL libraries from a CDN, because of the self-contained rule. Add each new file to the load order in **both** `build.py` and `build.ps1`.

### Task 5: Finish syllabus ingestion
Go through nebula-study topic by topic. Pull in the concepts from each summary plus all its MCQs, and add OSCE stations after the related syllabus station. Give the new stations map slots in `src/mapgeo.js`.

## 5. Open checks

- The newest content (the clozapine and neutropenia arc, lithium, delirium and dementia, emergencies) was written by an AI. Before relying on it, check thresholds and numbers against Maudsley and NICE, for example ANC cut-offs and lithium levels.
- Python may not be installed on the player's PC, so `build.bat` is the reliable build there.

## 6. Handoff discipline

When you stop, update section 2 (what you finished, with commit hashes) and section 4 (what remains) in this file. Commit and push it, so the next AI can carry on.
