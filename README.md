# FNPH Raid: psychiatry exam shooter

An arcade shooter (a fork of **Radius Raid** by Jack Rugile, MIT licence) rebuilt as a revision game for psychiatry exams, set on a map of FNPH Barnawa.

## Quick start

1. Install Python 3 if you don't have it.
2. In this folder, run `python build.py`.
3. Open `dist/fnph-raid.html` in Chrome and play.

Rebuild after every change. The game is a single HTML file with no server or internet needed, apart from Google Fonts.

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

## Recall and spaced repetition

- **Recall first** (home chip): *new and weak questions* (the default), *every question*, or *off*. The options stay sealed until you produce the answer yourself (say it aloud or type it), reveal it, and rate yourself: Got it, Partly or Missed. Only an honest "Got it" counts towards mastery.
- **Hint ladder:** button 4 on the controller, or H, shows the first letters, then half of each word, then nearly all of it. Using a hint caps your rating at Partly.
- **Spaced repetition:** every rating schedules the next review. A correct answer comes back in 1, 3, 7, 16, then 35 days; a miss comes back within the hour. **Daily review** on the home screen plays up to 30 due items from every station, mixed together.
- **Full raid order** (home chip): map order, study plan (mood first), weakest station first, or most reviews due first. Tap a station's name to include it in or skip it from the full raid.

## Controller

**Menus with only a gamepad:** use the d-pad or left stick to move the highlight, **button 1** to press, **button 2** to go back, and **Start** to start the raid. On cards, any button continues. In recall: button 1 reveals, button 4 gives a hint, then buttons 1, 2 or 3 rate Got it, Partly or Missed.


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
- Planned: `stealth` (007-style). Build each as its own `src/mode-*.js` using the same hook: `setupWave()` calls the mode's start function, and the mode calls `R.carrierDown(fake)` with the chosen option.

## Saved progress

Progress is saved in the browser's localStorage under keys starting `fnphraid.` (stats, captured stations, settings, custom deck). Saved progress is specific to the browser and file location.

## Rules for AI coding assistants

- Keep it a single self-contained HTML build. No frameworks, no server, no external scripts.
- Keep the Radius Raid credit and MIT licence (home screen "Credits and licence", and `vendor/radius-raid/LICENSE.md`).
- Content changes go in `src/deck.txt`, not in code.
- After any change, run `python build.py` and open `dist/fnph-raid.html` to test: start a raid, answer right and wrong, and check the teaching cards.
- Medical content must stay accurate to ICD-11 and standard guidance (NICE, Maudsley). Flag anything uncertain rather than inventing it.
