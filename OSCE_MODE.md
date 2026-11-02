# Essay and OSCE learning modes

The game now asks for the question format before building a session.

## OSCE

Each generated station contains a candidate brief, simulated role and ordered phases. Every phase teaches the next clinical action, exact example candidate words, an expected patient/relative cue, a suggested reply, rationale and critical-step status. The game compiles three distinct tasks per phase: next action, candidate words and response to the cue. Correct phrases are tested against phrases from other phases, with explanations of why those belong elsewhere in the consultation.

A teaching card introduces each phase before gameplay. The queue preserves phase and station order. Missed responses are practised before advancing. An ordered action drill rehearses the full station at the end. Teaching cards stop the clock. Several stations are supported when explicitly requested, with separate briefs and stage numbering.

## Essay

The same question can instead produce a structured essay plan: ordered headings, key points, a coherent model answer, application questions, coverage checklist and an essay-order rehearsal.

Version-1 general packs remain importable and playable. Version-2 OSCE/Essay sessions preserve their structures in export/import and keep separate progress. Existing general sessions must be regenerated with a selected format to gain station scripts.

## Validation

- Nebula: 12 server/contract tests passing. Tests distinguish Essay/OSCE schemas, verify per-phase speech/response drills and citation restrictions, and preserve legacy behavior.
- FNPH Raid: 3 engine integration tests passing. The actual deck parser and queue preserve phase order despite the normal random shuffle, show the correct script before practice, keep missed steps before future phases, preserve syllabus progress and support multiple stations.
- Rebuilt single-file web/offline game and ZIP. Controller mapping unchanged.

The generated patient/relative cues and scripts are educational examples, not actual patient findings or an official examiner marking scheme. Clinical content still requires checking against the cited guidance.
