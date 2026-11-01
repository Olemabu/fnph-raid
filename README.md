# FNPH Raid: psychiatry exam shooter

An arcade shooter (a fork of **Radius Raid** by Jack Rugile, MIT licence) rebuilt as a revision game for psychiatry exams, set on a map of FNPH Barnawa.

## Quick start

1. Install Python 3 if you don't have it.
2. In this folder, run `python build.py`.
3. Open `dist/fnph-raid.html` in Chrome and play.

Rebuild after every change. The game is a single HTML file with no server or internet needed, including fonts.

## Where things live

| File | What it does | Edit it when… |
|---|---|---|
| `src/deck.txt` | **All exam content**: stations, questions, wrong options with reasons, procedures, teaching notes, briefings | Adding or fixing questions. Most edits happen here. |
| `src/raid.js` | Game rules: stations, answer gunships, teaching cards, recall mode, par clock, mastery, controller, sound, menus | Changing how the game plays |
| `src/core.js` | Main loop, canvas, camera, swarm spawning (adapted from Radius Raid `game.js`) | Engine-level changes |
| `src/hero.js`, `src/bullet.js`, `src/storage.js` | Radius Raid files with small patches (controller movement, bullets hitting answers, safe storage) | Ship physics, bullets |
| `src/mapgeo.js` | The FNPH map: roads, buildings, the 13 station positions (`SLOTS`) | Moving or adding stations |
| `src/shell.html` | Page layout and all CSS: home screen, HUD, cards, study and edit screens | Look and layout |
| `vendor/radius-raid/` | Untouched original Radius Raid files plus its MIT licence | Normally never |
| `build.py` | Joins everything into `dist/fnph-raid.html` | Rarely |

Load order matters, so it is fixed in `build.py`. The global `$` is the engine namespace. Game logic is in the `R` object inside `raid.js` (`R.start`, `setupWave`, `R.carrierDown`, `R.die`, `stationCleared`, `R.pollPad`).

## Syllabus coverage

`src/deck.txt` is generated from **nebula-study** (`C:\Users\USER\Documents\nebula-study\data`, GitHub `Olemabu/nebula-study`) by `tools/nebula2deck.js`:
- **20 map stations = the 20 NPMCN Part I topics** in `data/syllabus.js`. Each station keeps its FNPH locus. The 5 new loci (Admin Block, OPD Clinic, Pharmacy, Library, Records Office) are placeholders: rename them to real FNPH places for your memory palace.
- **Concepts:** each high-yield point in `data/topics/<topic>.js` becomes a `### concept`. Its summary is the briefing, and all of its MCQs follow (all 1,783, with 4 wrong options sampled 3 at a time).
- **OSCE:** all 59 scripts in `data/osce/stations.js` are embedded as `### OSCE:` concepts inside their related topic. Each one tests phase order, which phase a line comes from, what the examiner checks, the critical fail and viva answers. They play as the first-person ward round, or as the ambulance run in Emergency.
- **Bonus drills:** the earlier hand-written stations are kept as `### Bonus drill:` concepts.
- **One run = one concept.** A station is taken when all its concepts are secured. After that, runs revisit the weakest concept.
- **To regenerate** after nebula changes: see the header of `tools/nebula2deck.js`, then rebuild.

## Deck format (`src/deck.txt`)

```
## Station name | Topic | mode          <- starts a station (map order; first 20 go on the map)
### Concept title | mode                 <- starts a concept inside the station (one run plays one concept)
> briefing line                          <- '>' lines under a station = briefing card
> - bullet                               <- bullet point
Q: question = right answer | wrong :: why it is wrong | wrong :: why | wrong :: why
> teaching note for that question
L: procedure in order = step 1 | step 2 | step 3 ~~ decoy :: why | decoy :: why
S: list in any order = item | item | item ~~ decoy :: why
```

Rules: exactly 4 options per `Q:` (the first is correct). Every wrong option and decoy needs a ` :: reason`. Wrong options should be near-misses: one key detail different from the right answer.

## Learning through gameplay

- Answers are visible immediately. Shoot the correct gunship, drive through its lane, or hit its ward-round panel. No reveal, hints or self-rating gate.
- Correct choices advance mastery and schedule later practice automatically. Missed choices return through the selected death mode; default drill repeats them until right, then again 2–3 questions later.
- Mnemonic lists can use `Term => description` for each item and decoy. The player sees the description; the canonical term appears after the choice. Ordered mnemonic prompts show the current letter. IDs and saved progress remain tied to the original prompt.
- Daily review plays due questions with the same direct gameplay. Correct answers are scheduled in 1, 3, 7, 16, then 35 days; misses are due within 30 minutes.
- Full raid order supports map order, study plan, weakest station first or most reviews due first.

## OSCE process memory routes

All 59 imported OSCE stations have short action-word cues for their 352 existing phases. Long routes are chunked into runs of up to four cues in the briefing. These are new learning aids, not official or validated scoring mnemonics; the original order, checklists and critical-fail notes remain authoritative.

The ordered process drill shows a cue, offers action descriptions from that station, then splashes the original phase name after a correct choice. Completed phases stay in the strip. No recall rating is required. For example, the suicide-risk route is **Trigger → Plan → Act → After / Mind → Risks and supports → Safe plan**. Read each cue's full mapping in Study the stations.

Deck syntax: place `> Process cues: cue 1 | cue 2 | cue 3` immediately after an `L:` item whose phases use `Phase => action description`. There must be one cue per phase. `tools/nebula2deck.js` preserves these additions from its previous-deck input when upstream phase names and order still match; changed sequences are regenerated for review.

## Controller

**Menus with only a gamepad:** use the d-pad or left stick to move the highlight, **button 1** to press, **button 2** to go back, and **Start** to start the raid. On cards, any button continues.


There is a built-in profile for the user's USB Gamepad (vendor 0810, product 0001): left stick (axes 0, 1) moves, right stick turns (axis 5 = left/right, axis 2 = up/down), axis 9 is the D-pad hat. It needs the ANALOG light on. See `PROFILE` in `R.pollPad` in `src/raid.js`. Other pads use automatic detection or the in-game **Set up controller** wizard.

## Aiming and the arsenal

- **Aim assist:** the answer plate counts as part of its gunship. The cursor snaps to the nearest gunship within about 70 px and stays on it until you clearly move away. Shots lead the moving target. A shot fired at a locked or hovered answer flies past the other answers, so you never hit a wrong one by accident. Keys 1 to 4 lock on, and the lock survives small mouse movements.
- **Arsenal:** the gun upgrades as total mastered items grow (`ARSENAL` in `src/raid.js`): Mk I Pulse (0), Mk II Twin (40), Mk III Plasma (120), Mk IV Rail (300), Mk V Seeker (700, homing rounds). From Mk III the answer gunships carry more armour. Power-ups stack on top (`src/core.js`).

- **Ramming:** flying into the correct answer counts as answering it, with a "Rammed it!" toast. Flying into a wrong answer counts as choosing it, so you die and see why it was wrong.

- **Drill mode (default):** a missed question comes straight back until you get it right, then once more 2 to 3 questions later for reinforcement. The home-screen "When I die" button cycles through drill, back into the queue, and restart station.

## Stage modes

A station can be played as a different mini-game. Add a third field to its deck header: `## Emergency Resus | Clozapine emergencies | race`. If there is no third field, any topic containing "emergency" plays as a race, and any topic containing "OSCE" plays as a first-person ward round.

- **race: Ambulance run** (`src/mode-race.js`). This is a pseudo-3D road. Each question is a gantry of colour-coded answer lanes, and the answer text is on cards along the bottom. To pick, steer with ←/→, the left stick, the mouse, keys 1 to 4, or by tapping a card. Hold ↑ to boost (more points) or ↓ to brake (more reading time). The lane you are in when you reach the gantry is your answer. It goes through `R.carrierDown()`, so grading, drill mode and teaching cards work unchanged.
- **fps: Ward round** (`src/mode-fps.js`). This is a raycast first-person ward. The answer panels walk towards you. Aim with the mouse (the screen edges turn you), ←/→ or the sticks. Fire with click, Space, F or the trigger. Keys 1 to 4, or tapping a card, lock on. Each panel takes 3 hits, so a stray shot won't pick an answer. If the panels reach you, you are overrun. It is used for OSCE stations (`| fps`, or any topic that mentions OSCE).
- **stealth: Blacksite** (`src/mode-stealth.js`). Evade patrol sight cones and use cover. Move with WASD/stick or click the floor. Keys 1–4 route to an answer terminal; Shift crouches; hold E, Space or the trigger nearby to hack. Touch controls are provided.

## Saved progress

Progress is saved in the browser's localStorage under keys starting `fnphraid.` (stats, captured stations, settings, custom deck). Saved progress is specific to the browser and file location.

## Rules for AI coding assistants

- Keep it a single self-contained HTML build. No frameworks, no server, no external scripts.
- Keep the Radius Raid credit and MIT licence (home screen "Credits and licence", and `vendor/radius-raid/LICENSE.md`).
- Content changes go in `src/deck.txt`, not in code.
- After any change, run `python build.py` and open `dist/fnph-raid.html` to test: start a raid, answer right and wrong, and check the teaching cards.
- Medical content must stay accurate to ICD-11 and standard guidance (NICE, Maudsley). Flag anything uncertain rather than inventing it.

## Operation Nightingale campaign

Deploy starts combat directly. The in-game Briefing button opens the story and concept notes on demand. The home hangar opens a saved, linear campaign with 20 chapters, all 339 existing concepts, and 19 inter-chapter ambulance transfers (358 missions). The story is fictional; clinical questions, OSCE checklists, source order and question IDs are retained in `src/deck.txt`.

- **Continue mission** resumes the first incomplete mission. Successful whole questions/processes save immediately to `fnphraid.campaign.v1`, so reloading resumes that mission without replaying already secured items. An unfinished process restarts its sequence. Existing mastery and free-flight progress are separate and preserved.
- All questions in the current concept that are not yet mastered are played; mastered items are never reviewed or replayed. OSCE process drills go first. Correct choices keep the campaign moving; wrong choices open the existing teaching card and repeat until right, then reinforce later in the run.
- Each transfer selects up to eight unmastered questions from earlier chapters, prioritising misses, overdue items and low mastery. If all earlier items are retired, it uses unmastered questions from the destination chapter; an empty transfer is skipped. Four original road environments rotate: hospital perimeter at dusk, wet neon city, underpass and blue-hour transfer. Roadside vehicles are scenery and do not interfere with answer grading.
- Five original vector mecha frames unlock at 0, 5, 15, 30 and 60 correct combat hits (previous chapter-based unlocks are preserved): Kestrel, Sentinel, Seraph, Archon and Nightingale. Silhouettes, wings, armour, reactor colours, hangar portraits, battlefield frames and ward-round weapon accents change. These frame rewards are cosmetic; the separate mastery-based weapon arsenal still determines combat upgrades.
- Returning to the hangar, pausing or closing the tab keeps earned progress. The original station selection, daily review, question editor, settings and credits are under **Free flight**.

`src/mecha.js` provides the shared vector renderer. `src/campaign.js` provides mission ordering, narrative, checkpoint saving, review transfers and hangar art. Both are included after the original game modes by both build scripts. No server, framework, raster download or external runtime dependency is added.

Mastery requires **three consecutive correct answers** per item. On mastery, the item is permanently retired from every gameplay queue, daily practice and transfer; existing streaks of 3 or more also qualify. Study remains available. Wrong answers before mastery reset the streak.

## War map and combat loadout (1 Nov 2026)
The command deck shows the actual combat-ship silhouette, current mastery-based weapon, projectiles per burst and unlimited energy ammunition. Its deployment button opens the 20-sector syllabus war map first. The map shows all 339 concepts and 2,740 learning items, per-topic retirement progress, inspectable concept lists and the next linear objective. Any topic and any unmastered concept can be selected and deployed directly.

Live cosmetic refits happen at 5, 15, 30 and 60 correct hits, without leaving combat or blocking input. Existing correct-answer totals seed the career-hit credit. At the highest frame, reactor livery keeps changing every 10 further correct hits. These visual rewards are separate from learning mastery and the existing weapon arsenal.

Startup is fully self-contained. External Google Fonts stylesheets have been removed, and engine boot uses DOMContentLoaded with idempotent initialisation. The war-map Deploy button enters combat directly; mission notes remain available through the optional Briefing control.

## Optional 3D prototype (disabled)
`src/mecha3d.js` renders original bevelled armour meshes, articulated joint housings, cylinders, weapon barrels, wing hardware and emissive elements with WebGL depth testing and lighting. The same renderer supplies the hangar portrait, loadout preview and combat mecha. Pointer movement over the hangar adjusts the viewing angle. The existing frame unlocks and livery remain in effect. If WebGL is unavailable or lost, the original Canvas renderer keeps the game playable. The user requested the previous ship shape, so both build paths now exclude this prototype and use the original vector renderer. This is a lightweight real-3D model renderer inside the existing 2D battlefield, not a HALO-equivalent 3D game engine or AAA asset pipeline.

## Special operations
Scroll below the command deck to the three operation cards. Select Night Dispatch, Ward Breach or Blacksite, choose a syllabus sector and concept, then Deploy operation. The original question IDs and permanent mastery retirement apply across all modes. The race environment can be selected independently. OSCE concepts are listed first for Ward Breach; other concepts are also available.
The optional WebGL renderer in `src/stage3d.js` supplies original lit 3D geometry, depth testing, fog, emissive surfaces, material detail and soft contact shadows. The fallback is the existing Canvas race/ward scene and a tactical overhead stealth view. No assets or scripts are fetched at runtime. `src/operations.js` supplies the menu, live scene thumbnails and touch controls. The original interceptor ship remains unchanged.

## Topic selection and random free runs
The war map now deploys the selected topic/concept, with no chapter lock. The concept list is selectable; continuing after a topic mission stays within that topic. Map progress is the saved correct-answer streak credit divided by three per item: untouched is slate, started is blue, 34–66% is amber, 67–99% is mint, and every item mastered is green. A missed first attempt still marks the topic as started. Selecting a topic adds an outline without replacing its progress colour. Mastered concepts remain disabled.
The Random free run button opens a mode selector for race, 007 or first person. Scope may be all topics or one topic; 10/20/40-item runs and continuous 20-item rounds are available. Samples use original item IDs without duplicates and exclude retired items. Ordered process items retain their internal sequence. Continuous runs resample the currently eligible pool after each round until the player leaves or masters everything. Random free runs advance automatically after correct answers, while wrong answers keep their teaching cards.
Vehicle choices are the response ambulance, Apex rally coupe and Bastion armoured SUV, with different models, colours, approach speed and manual steering. First-person weapon choices are the earned weapon, Pulse carbine, Twin-burst SMG and Longshot rail rifle, with actual fire-rate/damage/burst changes. Blacksite offers a stun dart pistol and EMP projector: F or the touch weapon button disables a visible nearby patrol (EMP affects all eligible nearby patrols). Disabling stops sight/detection and movement for the tool duration; recharge times differ. E/Space/trigger still hacks terminals.
These explicit loadouts apply only to operation runs. Starting a campaign or a legacy raid restores the earned arsenal. Build order includes `src/loadouts.js` before the stage renderers.

## Startup downloads
The menu displays a loading message while the embedded syllabus/game downloads, and launch controls stay disabled until initialization finishes. If the response is interrupted, use Retry download to request a fresh copy. Retrying does not clear saved progress. `src/startup.js` runs before the syllabus payload and the build signals readiness after all game modules load.

The executable bundle and syllabus are compressed inside the HTML and unpacked locally by `src/unpack.js` using DecompressionStream. This reduces the self-contained file size while preserving offline operation in supported browsers. No external runtime files are fetched. A missing decompression capability produces a visible browser-update message.
