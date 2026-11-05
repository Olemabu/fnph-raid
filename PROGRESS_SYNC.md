# Shared MCQ progress

Nebula: More → Sync MCQ progress. Raid: Progress → Sync with Nebula, or MCQ map → Sync with Nebula. Create a private profile on one device, show its code, and link the other devices with that same code. Never use the AI study access code. Keep the code private; it authorizes access to the profile. No email or real name is required. Disconnect keeps local study results.

Only the 1,783 exact source MCQs sync. Game-generated and unmatched bonus/OSCE drills are excluded. The mapping is generated with `node tools/build-progress-map.cjs ../nebula` in the Raid checkout; existing game IDs remain unchanged, preserving saves. Changed question/answer signatures are not linked.

Existing answered MCQs seed the profile once on linking. Conflicting legacy results merge conservatively: unfinished repeat work wins over an undated completion. New immutable answer events replay in timestamp/ID order; duplicate retries do not earn extra credit. First-time correct answers complete an MCQ. Misses/guesses reset two required successes; each subsequent correct answer reduces that count, regardless of app/device. A retry/undo reverses its credit. Offline events remain in per-event localStorage entries until acknowledged. A reconnect, foreground return, manual Sync now or one-minute foreground poll reconciles progress. Different devices should have automatic date/time enabled.

Authentication uses a 256-bit random personal capability code over HTTPS, sent only in an Authorization header. D1 stores its SHA-256 hash, canonical question IDs and answer events, not the code or AI credentials. Codes never enter URLs, analytics or application logs. The worker restricts origins and validates and bounds payloads. Profile possession is the identity: anyone given its code can read/write that profile. Use a new profile for a separate learner. Each device's existing study records stay local until the user links it.

Server: `npx wrangler d1 execute nebula-raid-progress --remote --file progress-server/schema.sql --config progress-server/wrangler.jsonc`, then `npx wrangler deploy --config progress-server/wrangler.jsonc`. Schema creation is idempotent. Client and reducer must remain identical in both repositories. No AI/provider API call is used by sync.

Android: update Nebula to v71 and FNPH Raid to v1.1. Existing signing keys and package IDs are reused so app updates preserve Android local data. Browser and Android need to link separately.
