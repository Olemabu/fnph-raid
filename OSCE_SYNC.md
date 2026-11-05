# Shared Nebula OSCE practice (v1.2.8 / Nebula v77)

Study session → Today's Nebula OSCEs uses the same daily selector, canonical station IDs, personal start date, learning records and two-station allowance as Nebula. Source scripts and examiner checks come from Nebula's actual OSCE bank, bundled by tools/build-timetable.cjs. No provider call or API key is needed.

Each station teaches its original phases in order, tests candidate wording and examiner checks, then rehearses the complete order. Full source wording is retained and long answers scroll. Aircraft, controls, mecha targets and MCQ repeat behaviour are retained. Next set returns to the OSCE plan, never a third station.

The authenticated /osce endpoint atomically reserves up to two distinct stations per profile and local calendar day in D1. Existing Nebula seen-day records consume slots. Canonical bank, campaign, searched and imported OSCE content pass the engine guard; custom sessions use stable title IDs and consume the same allowance. A linked installation must connect before opening a station in a new app session; an already admitted game may continue offline. Completion retries after reconnecting. Old clients must be upgraded and share the same Central saves profile.

Completing a canonical daily station writes guided practice (stage at least 1 and seen day) to Nebula. It never awards a spoken full-run pass or lowers existing mastery. A reservation alone does not mark study complete. Whole-station game item statistics remain in Raid's cumulative saves.

A self-contained web copy is hosted at https://nebula-study.pages.dev/raid.html?osce=today as a reliable alternative to GitHub Pages. Rebuild Raid, then copy dist/fnph-raid-offline.html to Nebula raid.html before publishing both. This mirror contains all game assets and does not register a second service worker over Nebula. It is excluded from the Nebula APK; Raid has its own signed APK.

Validation: SQLite-backed server tests cover simultaneous claims, two-slot limits, legacy work, day rollover, owner isolation and guided-only credit. All 59 station scripts compile with exact source answers and ordered phases. Synthetic live service/profile checks and landscape browser checks verify linked station launch and the cross-app allowance. Physical Android installation is not tested.
