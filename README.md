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

## Deck format (`src/deck.txt`)

```
## Station name | Topic                 <- starts a station (route order; first 13 go on the map)
> briefing line                          <- '>' lines under a station = briefing card
> - bullet                               <- bullet point
Q: question = right answer | wrong :: why it is wrong | wrong :: why | wrong :: why
> teaching note for that question
L: procedure in order = step 1 | step 2 | step 3 ~~ decoy :: why | decoy :: why
S: list in any order = item | item | item ~~ decoy :: why
```

Rules: exactly 4 options per `Q:` (the first is correct). Every wrong option and decoy needs a ` :: reason`. Wrong options should be near-misses: one key detail different from the right answer.

## Controller

There is a built-in profile for the user's USB Gamepad (vendor 0810, product 0001): left stick (axes 0, 1) moves, right stick turns (axis 5 = left/right, axis 2 = up/down), axis 9 is the D-pad hat. It needs the ANALOG light on. See `PROFILE` in `R.pollPad` in `src/raid.js`. Other pads use automatic detection or the in-game **Set up controller** wizard.

## Saved progress

Progress is saved in the browser's localStorage under keys starting `fnphraid.` (stats, captured stations, settings, custom deck). Saved progress is specific to the browser and file location.

## Rules for AI coding assistants

- Keep it a single self-contained HTML build. No frameworks, no server, no external scripts.
- Keep the Radius Raid credit and MIT licence (home screen "Credits and licence", and `vendor/radius-raid/LICENSE.md`).
- Content changes go in `src/deck.txt`, not in code.
- After any change, run `python build.py` and open `dist/fnph-raid.html` to test: start a raid, answer right and wrong, and check the teaching cards.
- Medical content must stay accurate to ICD-11 and standard guidance (NICE, Maudsley). Flag anything uncertain rather than inventing it.
