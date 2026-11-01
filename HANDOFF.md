# HANDOFF: where FNPH Raid is and what to do next

Read this first if you are an AI picking up this project (Antigravity, Codex, Claude, Copilot, Cursor). Then read `README.md` (architecture, deck format) and `AGENTS.md` (rules). Last updated 31 Oct 2026.

## 0. Ground rules

- **GitHub is the source of truth:** `https://github.com/Olemabu/fnph-raid` (private, branch `main`). Local copy: `C:\Users\USER\Downloads\fnph-raid-project\fnph-raid-project`. Run `git pull` before you start. Push after every finished step.
- **Build:** run `build.bat` on Windows (PowerShell port of the build script). Use `python build.py` where Python exists. Both write `dist/fnph-raid.html`. Commit the rebuilt `dist` file with the source.
- **Sync:** double-click `push.bat`. It pulls, commits everything and pushes. To set the commit message, write it to `.commitmsg` first. The result is written to `.last-push.txt`. This lets a tool without terminal access still push.
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
| Aim + arsenal (after `a888cd6`) | **Task 1 done:** aim assist (plate hit area, snap, sticky lock, lead aim, smart rounds that skip non-target answers). **Task 3 done (first pass):** arsenal tiers Mk I to Mk V tied to total mastery, plus armoured gunships at higher tiers. Map slots for stations 14 and 15 added. Ramming the correct answer now scores (player request). Drill mode added and made the default: a missed question repeats immediately until right, then again 2 to 3 questions later (`reinforce()` and `respawn()` in `src/raid.js`). Tested headless with Playwright: in mouse aim tests on plate, near-ship and jittery cursor, the intended answer was hit every time. |

Current stations (in `src/deck.txt`): Main Gate, Car Park, Main Block, NE Wing, Pink Quad (schizophrenia), Clozapine Clinic (OSCE), Emergency Resus (OSCE/emergency), U-Block, Sports Field, West Courtyard, Long Red Ward, Round Huts, South Ward (OSCE), Courtyard Block (OSCE), SE Clinic (OSCE). All 15 now have map slots (`SLOTS` in `src/mapgeo.js`). Add a slot for every new station.

**Teaching design the player agreed to:** OSCEs are **embedded as the next stage** after the related syllabus station, then the route returns to the syllabus. Conditions chain into their complications (for example schizophrenia → clozapine → neutropenia).

## 3. The syllabus source

- Repository: `https://github.com/Olemabu/nebula-study` (local: `C:\Users\USER\Documents\nebula-study`). There is also a reader at `C:\Users\USER\Documents\nebula-study-reader`.
- Topics: `data/topics/*.js` (for example `mood.js`). OSCEs: `data/osce/stations.js`. Explanations: `data/why/*.js`.
- Each topic has a long **lecturer's note** and a **summary**. **Build the game from the summaries, not the long notes.** The player said the summaries are enough for long cases.
- **Teach by concept, not whole modules.** Each station covers a few related concepts.
- **Include all the MCQs** from nebula-study.
- Verify the medical content of everything you pull in (see the rules in section 0).

## 4. Earlier task list (history; see 4b for what is next)

Do one task at a time. After each: build, play-test, commit and push.

### Task 1: Fix aiming: DONE
See "Aiming and the arsenal" in README. If the player still reports misses, tune `SNAP`, `KEEP`, `PLATE_PAD` and `UNLOCK_MOVE` near `R.pickAt` in `src/raid.js`, and the gamepad cone (`bd=.34`, hysteresis `.5`) in `R.pollPad`.

### Task 2: Gated progression: ALREADY IN THE GAME
With the default death mode ("question goes back into the queue"), a wrong answer re-queues the item later in the station. The station only clears when every item has been answered correctly. A toast now explains this on respawn. Behaviour: `respawn()` and `nextQuestion()` in `src/raid.js`.

### Task 3: Upgrades: FIRST PASS DONE
Arsenal tiers (`ARSENAL` in `src/raid.js`, applied in `src/core.js`) and gunship armour. Still to do: **enemy (swarm) variety by tier**, for example shielded and splitting enemies, using the `vendor/radius-raid/definitions.js` enemy types through `$.setDifficulty`. Also visual flair for each gun tier (muzzle flash, bullet trail shape).

### Task 4: Varied stage modes (large, do each as its own step)
**Racing: DONE** (`src/mode-race.js`, the ambulance run on Emergency Resus, West Courtyard and Round Huts). Use it as the template for the next modes (see "Stage modes" in README). **First person: DONE** (`src/mode-fps.js`, the ward round on Clozapine Clinic, South Ward, Courtyard Block and SE Clinic). **Next: `stealth` (007).** Ideas: sneak past guard sight-cones to reach the right answer's door, or plant the device on the correct option before the patrol turns.

The player wants some stages played differently:
- a 3D first-person shooter
- a "007" spy or stealth stage
- a racing stage

The engine is a **2D top-down canvas** shooter. Build each mode as a separate self-contained mini-mode in its own file (for example `src/mode-race.js`), entered from specific stations (OSCE or emergency stages are a natural fit). Use the same deck item format (`Q:`, `L:`, `S:`). Use pseudo-3D (raycast or Mode-7 style) on canvas: no WebGL libraries from a CDN, because of the self-contained rule. Add each new file to the load order in **both** `build.py` and `build.ps1`.

### Recall upgrade: DONE (Oct 31)
Smart recall-first (default), hint ladder, spaced-repetition due dates (`SRS_DAYS`, `grade()`), the Daily review run (`reviewRoom()`), the route-order chip (`routeRooms()`, `PLAN_ORDER`) and full gamepad menu navigation (`padNav()` in `R.pollPad`). Graphics pass on both modes: race scenery, roll, headlights, boost streaks and bursts; ward-round floor and ceiling casting, beds, sparks and shards, vignette.

### Task 5: Finish syllabus ingestion: DONE (Oct 31)
The whole of nebula-study is in the game: 20 topic stations, 339 concepts, 2,740 items (1,783 MCQs, 59 OSCE scripts as 803 items, plus the bonus drills). See "Syllabus coverage" in README. Still to do: rename the 5 placeholder loci; optionally use nebula `why/` and `lectures/` for richer teaching notes; set the route order to the nebula 8-week plan.

(Original task text follows.)
Go through nebula-study topic by topic. Pull in the concepts from each summary plus all its MCQs, and add OSCE stations after the related syllabus station. Give the new stations map slots in `src/mapgeo.js`.

## 4b. BACKLOG FOR THE NEXT AI (Codex): start here. Agreed priorities, in order

The game is feature-complete for daily use (latest commit `38985a1`). Work these one at a time: build, test, commit and push after each.

1. **Why each wrong option is wrong.** Nebula MCQs have one `explain` per question, so the death card can't say why *your* pick was wrong. Add `:: reason` per wrong option in `src/deck.txt`. Do this in `tools/nebula2deck.js`, or in nebula itself and regenerate. Start with the topics where the player misses most (read `fnphraid.stats` misses). Never invent facts: mark anything unsure with `[CHECK]`.
2. **Exam simulation mode.** A home button. Timed, mixed questions from all 20 topics, in NPMCN Part I format; no teaching cards or recall gate during the run; a score breakdown by topic at the end, plus a review list. Reuse `R.start([room])` with a synthetic room like `reviewRoom()` and a flag that skips cards.
3. **Weak-spot dashboard.** A home panel listing the worst concepts by miss rate (`stats[id].wrong/seen`) and overdue reviews, with a "Drill these" button that builds a synthetic room from those items.
4. **Progress backup and sync.** Export and import `localStorage` keys starting with `fnphraid.` (stats, cdone, captured, settings) as a JSON file. Optional: save to a Gist or Drive. Progress currently lives only in one Chrome profile.
5. **OSCE out-loud mode.** For `### OSCE:` concepts: show the phase cue, the player says their line aloud and presses button 1, then the game reveals the model "say" and the examiner checklist, and the player ticks what they covered (gamepad: d-pad plus button 1). Nebula's `osce/stations.js` has `phases[].say/check`, `critical` and `viva`. Use nebula's `osceRubric` if helpful.
6. **Long-case station.** Nebula has `data/longcases-a.js`, `-b.js` and `-pocket.js`. FNPH style: clerk first, then follow the ICD-11 pathway and show whether each requirement is present or absent (for example, dependence in substance cases). Never force the diagnosis. A good fit is an `L:` sequence or a step-by-step present/absent drill.
7. **The 12 missing OSCE stations.** The syllabus plans 71 (`syllabus.js` osce groups), but nebula has 59. Draft them in nebula's station format for the player to review; mark them as drafts.
8. **007 stealth mode** (`src/mode-stealth.js`, `| stealth`). Sneak past guard sight-cones and enter the door showing the right answer; a wrong door is an alarm, which counts as a wrong pick through `R.carrierDown(fake)`. Copy the structure of `mode-race.js` and `mode-fps.js` (hook in `setupWave()`, `MODES` in `raid.js`, build lists in both `build.py` and `build.ps1`).
9. **Enemy variety by arsenal tier** (shielded and splitting swarm enemies) via `$.setDifficulty` and `vendor/radius-raid/definitions.js` types (override in `src/`, never edit vendor).
10. **Rename the 5 placeholder loci** (Admin Block, OPD Clinic, Pharmacy, Library, Records Office) in the `SLOTS` table of `tools/nebula2deck.js`. Ask the player for the real FNPH place names, since they are his memory palace.
11. **Phone play:** GitHub Pages, or another private hosting the player approves, for `dist/fnph-raid.html`.
12. **Nebula sync script:** one command that loads nebula-study, writes `nebula.json` and regenerates `src/deck.txt` (see the header of `tools/nebula2deck.js`).

### How the previous AI worked (useful for Codex)
- **Build:** `python build.py` (or `build.bat` on Windows). The output is `dist/fnph-raid.html`, about 1.6 MB, because the whole deck is embedded.
- **Headless testing with Playwright:**
  - Open `dist/fnph-raid.html` and click `button.attack` (index = station).
  - Teleport the hero to the station with `SLOTS[$.raid.rooms[$.raid.si].idx]` × 2 to trigger the briefing.
  - Then drive answers through `$.raid.wave.correct`. Ram by setting `$.hero.x/y` to a carrier, press keys 1 to 4, or simulate a gamepad by overriding `navigator.getGamepads`.
  - Check `$.raid.phase`, `correct` and `deaths`, and watch for `pageerror`.
- **Game state you will need:**
  - `$.raid` (alias `R`): `modeName()`, `concept`, `queue`, `wave`, `carrierDown(fake)`.
  - Stats in `localStorage['fnphraid.stats']`: `{box, right, wrong, seen, due}`.
- **Pushing without a terminal:** double-click `push.bat`; a message in `.commitmsg` is used and then deleted.
- **Player's controller:** a generic USB gamepad (vendor 0810, product 0001), with a profile in `R.pollPad`. Button 1 = confirm, 2 = back or partly, 3 = missed, 4 = hint; d-pad on axis 9.

## 5. Open checks

- The newest content (the clozapine and neutropenia arc, lithium, delirium and dementia, emergencies) was written by an AI. Before relying on it, check thresholds and numbers against Maudsley and NICE, for example ANC cut-offs and lithium levels.
- Python may not be installed on the player's PC, so `build.bat` is the reliable build there.

## 6. Handoff discipline

When you stop, update section 2 (what you finished, with commit hashes) and section 4 (what remains) in this file. Commit and push it, so the next AI can carry on.

## Gameplay update (31 Oct 2026)

User requested removal of unaided recall from gameplay. Removed reveal/rate gate and its controls across all three modes; successful gameplay choices now grade mastery directly. Existing saved recall preferences are ignored; progress is preserved. Seven mnemonic drills use `Term => description` labels, with current-letter cues and terms revealed after choosing. Includes CAGE, SAD PERSONS, ASEPTIC, SIG E CAPS, five Cs, SPIKES and the four As. Miss/reinforcement and scheduled practice remain automatic. This supersedes the recall-first descriptions above.

### Answer splash reward (31 Oct 2026)
Correct mnemonic description picks now show a central letter + term splash (for example D — DEPRESSION) for 1.1 seconds, with the existing correct-answer sound. World action slows during that reward; the resolution timer uses real gameplay time. No extra input is needed. The term remains in the completed chain. Wrong answers never trigger it; restart, next wave and exit clear it. Reduced-motion preference disables the impact scaling.

### OSCE process cues (31 Oct 2026)
Added new action-word memory routes to all 59 existing OSCEs (352 phases), using the imported phase order and source scripts. Source `nebula-study/data/osce/stations.js` explicitly credits OSCE_Practice_App_Source_Material.pdf, Dr Faty Baba FNPH Kaduna and Abdulhakeem OSCEs 2. Cues supplement the source; they are not attributed to those authors or claimed as validated mnemonics. All original question IDs, checklists, critical-fail notes and clinical sequences are retained. Process drills display short source action descriptions, accept only the next phase, reveal the phase with the automatic splash, and use same-station distractors. Briefings and Study show the route and cue-to-checklist mappings. Existing seven acronym sets remain. Generator preserves authored labels/cues only when original phase names/order match.

### Operation Nightingale (31 Oct 2026)
Added the linear fictional campaign, a cinematic vector hangar, narrative mission/debrief cards, partial-mission saves, five earned mecha silhouettes and four race environments. All 339 concepts / 2,740 items / 59 OSCEs remain in the campaign; there are 19 review transfers for a total of 358 missions. Frame milestones are completed chapters 3, 7, 12, 17; base frame is available immediately. Frame art changes are cosmetic and do not alter the measured controller mapping, hitbox or mastery arsenal. Campaign progress is independent of existing free-flight cdone/stats and uses `fnphraid.campaign.v1`. Process steps keep their existing order. Wrong choices still teach and drill; correct-answer cards are suppressed during the campaign for flow. All legacy tools live under the Free flight disclosure. Register any future modules in both build scripts. See README for checkpoint semantics and race-review selection.
Validation: headless Chromium exercised real page rendering and game logic on desktop and 390px mobile. Checked course-item coverage, wrong-answer death/teaching/retry, partial-mission reload, sequential advancement, frame thresholds, campaign completion, review transfer selection, city/underpass rendering, mobile overflow and simulated measured-controller axes. No page errors in those runs. A final focused run checked the mobile-art adjustment, direct in-chapter briefings, combat frame rendering and eight-question transfers with already-mastered source questions. Physical controller hardware was not available in the test environment.

### Four-answer mastery (1 Nov 2026)
Mastery threshold is now 4 consecutive correct answers. Weak-concept selection uses the shared predicate; mastery percentages and study dots use the same threshold. The fourth answer already skips the teaching card (previously only answers mastered before that attempt did). Wrong answers continue to reset box/streak to zero. Existing stats and SRS scheduling are retained.

### Command deck, syllabus war map and immediate refits (1 Nov 2026)
Supersedes the four-answer rule above: mastery is now THREE consecutive correct answers, then permanent retirement from all gameplay queues. Due lists, transfer pools, mission queues, restart and reinforcement paths exclude mastered items. Already-saved box>=3 qualifies; study is retained. The campaign skips concepts with no eligible items and never revives retired items to fill a transfer. The full syllabus war map is a pre-deployment screen with 20 exact topic labels, counts, progress and concept inspection. The command deck exposes the current combat ship, actual weapon stats and unlimited energy ammo. Frame unlocks are now correct-hit milestones 5/15/30/60 (old earned chapter upgrades preserved); the combat model changes immediately with a nonblocking refit banner. Prior stats.right totals seed cosmetic career credit. Highest-tier reactor colours continue cycling every 10 hits. Gamepad menus include the new map; measured movement/aim axes are unchanged.

Validation: real headless Chromium runs checked all 20 map sectors, topic inspection without skipping campaign order, map-before-deploy flow, actual correct-hit frame unlock at 5 and later thresholds, livery changes after 60, legacy box=3 retirement, third-hit card/reinforcement suppression, retirement exclusions in normal/daily/transfer paths, all-retired empty campaign handling, desktop/mobile overflow, loadout-canvas containment and simulated controller map launch/deploy. No page errors in the completed runs.

### Startup and direct deployment fix (1 Nov 2026)
Reproduced stalled external-font startup using the deployed HTML. Removed Google Fonts network dependencies, changed engine boot to DOMContentLoaded and made init idempotent with a defensive start guard. War-map Deploy now starts combat directly, removing the chained cinema/briefing/start confirmations. An optional in-game Briefing button retains the existing narrative and concept notes. This is a playability fix; the current Canvas graphics are still 2D and must not be described as HALO-quality 3D modelling.

### Real 3D mech model (1 Nov 2026)
User clarified HALO meant 3D mechanical detail, not colours. Added original dependency-free WebGL mesh rendering for the mecha in `src/mecha3d.js`: bevelled hard-surface armour, joint housings, weapon barrels, frame-specific hardware, lighting, emissive elements and pointer-controlled hangar viewpoint. It renders in hangar/loadout/combat through the shared drawFrame interface. The battlefield remains 2D. Do not call this HALO-equivalent or a full 3D engine. Fallback retains Canvas playability if WebGL is absent/lost. Source build registration added to both Python and PowerShell paths. Returned command UI highlights to existing project gold instead of the imposed military-green accent.
Validated real WebGL availability/rendering, hangar viewpoint change, direct combat deployment, correct-answer progression and optional briefing resume in Chromium with external requests blocked.

### Ship shape reverted (1 Nov 2026)
At the user’s request, restored the previous vector ship/mecha renderer by removing the 3D override from both build paths. Startup fixes, direct deployment, war map, early refits and mastery retirement are unchanged. The unselected 3D prototype remains in source history/files but is not loaded.

### Original interceptor restored (1 Nov 2026)
The previous revert only disabled WebGL; the vector mecha override still replaced the original ship. Combat and both previews now share the original interceptor artwork from hero.js. Original flight effects, railguns and damage shield remain. Earned refits add wing extensions. Campaign, mastery and controls are unchanged.

### Special operations and 3D stage rebuild (1 Nov 2026)
Added visible operation cards and syllabus/concept selectors on the home screen: Night Dispatch (race), Ward Breach (first person), Blacksite (007-style stealth). Any eligible concept can run in a chosen operation; original item IDs/mastery are shared and retired items stay excluded. Race has four selectable route environments. Direct deployment bypasses travel/briefing.
New dependency-free src/stage3d.js renders lit WebGL geometry for the road, vehicles, buildings/underpass, ward, beds, target drones and weapon. It uses fog, emissive strips, contact shadows, material grain and restrained bloom; existing Canvas environments remain as fallbacks if WebGL is unavailable. Special stages render at ~30 fps to bound GPU work. These are original stylised 3D scenes, not AAA/photoreal assets.
New src/mode-stealth.js implements patrol movement, visible sight cones, occlusion by cover, detection meter, crouching, click-to-move, answer-terminal routing, proximity and hold-to-hack. WASD/left stick move; 1–4 plots a safe-corridor route, Shift crouches, E/Space/trigger hacks. Touch buttons support crouch/hack, FPS fire and race boost/brake; Menu is accessible on phones. Blacksite is selectable directly, not inserted into the linear campaign automatically. Both build paths include all new modules.
Validation: real browser input completed correct racing (lane/boost), shooter (lock/fire/three hits) and stealth (route/crouch/hack) answers. Desktop/mobile screenshots reviewed, all modes launched with WebGL disabled, measured controller axes 0/1 and 5/2 verified by simulation. Physical controller testing was unavailable. Wrong answers, teaching cards and respawn also passed in all three modes. Desktop and 390px phone layouts were reviewed; the phone controls and map framing were corrected.

### Selectable syllabus and random free runs (1 Nov 2026)
Supersedes the earlier locked/linear war-map description. Select any topic and any eligible concept, then Deploy selected mission. Topic runs continue through unfinished concepts in that topic. The map reads saved item stats: slate untouched, blue started, amber halfway (34–66%), mint nearly mastered (67–99%), green fully mastered. Percentage includes box/3 streak credit, capped at 99 until all items are mastered; any prior attempt marks started even at zero streak credit. Full mastery remains permanent retirement.
Added Random free run with selectable race/007/FPS, all-topic or single-topic sampling, 10/20/40 items or continuous rounds. Original IDs and ordered sequences are preserved; retired items are filtered at sampling and when queues advance. Continuous rounds resample only eligible items and stop if the pool is empty.
Added src/loadouts.js for explicit operation-only equipment. Race vehicles have distinct models/colours, speed and manual handling. FPS weapon profiles change burst damage/fire rate and model details. 007 has functional stun dart/EMP tools with range, duration and recharge, invoked with F or touch; the hack interaction remains E/Space/trigger. Campaign and legacy starts clear operation loadouts. Both build scripts register the new module.
Validation: browser checked arbitrary-topic/concept deployment; persisted map states at untouched/33/50/67/100%; mixed-topic sampling without mastered items; continuous refill; selected coupe/SUV; rail damage and real answer firing; real EMP deployment; campaign loadout reset; phone selection/layout and non-WebGL vehicle fallback. Continuous runs also passed three queue/grade rounds and stopped once all remaining items retired; exhausted pools disable deployment. Random free runs suppress correct-answer cards for flow while retaining wrong-answer teaching. Controller axes passed simulation; physical controller remains untested.
