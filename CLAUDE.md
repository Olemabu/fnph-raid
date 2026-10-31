# Instructions for AI assistants (Antigravity, Codex, Claude, Copilot, Cursor)

Read HANDOFF.md first (current status and next tasks), then README.md for the architecture and deck format.

- GitHub is the source of truth. Pull before you start; commit and push when done, with a clear message.
- Keep it a single self-contained HTML build. No frameworks, no server, no external scripts.
- Keep the Radius Raid credit and MIT licence (home screen "Credits and licence", and `vendor/radius-raid/LICENSE.md`).
- Content changes go in `src/deck.txt`, not in code.
- After any change, run `build.bat` (Windows) or `python build.py` and commit the rebuilt `dist/fnph-raid.html` too (GitHub Pages serves it).
- Test: start a raid, answer right and wrong, check the teaching cards, check the gamepad still works.
- Controller default: left stick moves the ship, right stick (axis 5 = X, axis 2 = Y) turns it on its axis. Do not change it.
- Medical content must stay accurate to ICD-11 and standard guidance (NICE, Maudsley). Flag anything uncertain rather than inventing it.
