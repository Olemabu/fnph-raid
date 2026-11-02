# Fifth review: Nebula and FNPH Raid

Implemented 2 November 2026.

## Changes

- Voice Tutor defaults to 0.85×, offers 0.65–1.15× speeds and waits until between generated turns to apply changes. The medical transcription vocabulary includes enuresis and desmopressin. Automatic VAD interruption is disabled; Let me speak remains an explicit interruption control.
- Long explanations are prompted as complete short sections with Continue. Transcripts can be replayed in bounded 500-character segments, paused, repeated and resumed. The latest explanation and replay position survive reconnects in this tab. Replay uses device speech synthesis; it does not restore exact streamed-audio timing or an entire previous conversation.
- A correction field deletes the misheard input turn and sends the user's explicit wording. No drug names or doses are silently rewritten.
- MCQ search results open the actual question player. Stable #mcq=<id> links survive reload and preserve question identity.
- Search accepts long school questions using keyword ranking. Question workspace keeps the model answer, examiner practice checklist, critical actions, an eight-minute rehearsal timer and Voice Tutor role-play together.
- Source-based AI study generation is an authenticated Cloudflare Pages Function. It returns validated drafts with model answer, checklist, role, citations and MCQs. Existing OPENAI_API_KEY and TUTOR_CODE stay in deployment secrets. Requests are bounded, origins checked, responses marked no-store, and provider errors sanitized.
- Versioned JSON study packs and deck exports share content with FNPH Raid without credentials. Imports are validated and played in an isolated practice room. The existing syllabus and saved deck are preserved. Sharing is explicit export/import; no automatic account synchronization is claimed.
- Enuresis before university is included as an offline sourced example and as a bonus concept in the game's interview station. Includes privacy/consent, assessment, alarm/desmopressin choices, fluid safety, practical university support and follow-up.
- Both game builders include the shared validator and workspace; rebuilt online/offline HTML and offline ZIP are included. Nebula builds exclude env files and local test/snapshot metadata.

## Five review passes

1. Existing behavior and navigation: examined voice relay, Android foreground service, search index, MCQ player, game parser and build process. Reused existing flows and avoided changing controller mapping.
2. Functional implementation: verified question import/export, practice and deep links in Chrome at phone width. Fixed direct links to answered questions opening a score screen.
3. Reliability: segmented replay, saved checkpoint, incomplete response feedback, timeout/error paths and continued access to readable transcripts. Added a real rehearsal countdown.
4. Security and clinical content: tested authorization, origin allow-list, malformed/oversized input, invalid answer indices, delimiter injection and invented source rejection. Generated content stays labelled draft. The example cites NICE CG111 and Royal Children's Hospital guidance; its checklist is a practice aid, not an official marking scheme.
5. Final integration: rebuilt both apps; ran six automated server/contract tests, browser workflow checks, simulated voice-event checks, and a playable game test with right/wrong answers, teaching card and controller polling. Fixed shared module behavior for browser/server bundling and imported-practice labelling.

## Validation

- `npm test` in Nebula: 6/6 passing.
- JavaScript syntax checks: passing.
- Nebula web build: passing.
- FNPH Python game build: passing; the PowerShell build list was updated to match.
- Chrome: MCQ search → specific question → reload, enuresis pack, rehearsal, self-assessment, game import/search/start: passing, no page errors.
- Simulated voice transport: deferred speed, bounded replay, pause/resume, correction and saved explanation: passing, no page errors.
- Game: correct and wrong carrier answers, teaching card, controller polling: passing, no page errors. Physical controller hardware was not used.

## Deployment and remaining live checks

No new API key was created or copied. The existing server secret is referenced by name; its value was never retrieved. No paid/live model call was made. Live audio quality, microphone behavior on the user's Android device, and generation against the deployed provider remain to be checked after deployment. No new signed APK was built.

Deploy Nebula's repository root with its `functions/` folder on Cloudflare Pages, retaining existing OPENAI_API_KEY and TUTOR_CODE; optional STUDY_MODEL and ALLOWED_ORIGINS configure generation and extra approved web origins. A static-only web export cannot run these Functions. FNPH Raid remains self-contained and offline; its normal GitHub Pages workflow builds the game after merge.

### Example sources

- NICE CG111: https://www.nice.org.uk/guidance/cg111/chapter/Recommendations
- Royal Children's Hospital: https://www.rch.org.au/clinicalguide/guideline_index/Enuresis_-_Bed_wetting_and_Monosymptomatic_Enuresis/
