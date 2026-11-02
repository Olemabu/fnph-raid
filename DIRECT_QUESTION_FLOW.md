# Direct question-to-game flow

FNPH Raid now supports: paste a question → research sources on the server → organise a model answer/checklist → create teaching and practice questions → play repeated practice.

Open **Turn a question into a game**, paste the school question, enter the existing **study access code** and choose **Build my learning session**. Read the sourced teaching answer, then choose **Play my session**. No manual Nebula export/import is required.

The existing Nebula Cloudflare service performs the research and generation. The provider API key stays in its server secrets. The game accepts a study access code only, rejects common provider-key prefixes, and keeps the code in memory rather than saved storage. The provider searches authoritative clinical domains and returns source URLs; the server rejects missing evidence or unverified source references. Generated sessions are labelled educational drafts for source review.

Each new generated session must contain at least eight MCQs plus an examiner-checklist drill. Teaching cards explain answers. Questions and checklist drills repeat toward three successful passes; misses are requeued. Session-specific progress is saved separately from the syllabus, and a completed session can be practised again. This measures practice completion, not a guarantee of clinical understanding or exam performance.

Saved sessions and the question draft survive reload and work offline. Building a new session needs internet. Cancellation, provider errors and failed generation preserve the previous session.

## Validation

- Eight automated server/contract tests pass, including required web research, source filtering, game origins and failure without sources.
- Chrome workflow check passes for arbitrary pasted questions, simulated generation, visible sources/model answer, play, nine correct gameplay actions to clear a small session, saved-session reload, access-code privacy, cancellation and provider-error recovery.
- Separate gameplay check passes for correct/wrong answers, teaching cards and controller polling. No browser page errors.
- Game HTML, offline HTML and ZIP rebuilt. No paid/live model request was made, so actual research quality and deployed-service access still require verification.

For the checked-in browser regression: install Playwright as a development tool, build with `python build.py`, then run `node tests/single-flow.cjs`. Chrome must be installed. `PLAYWRIGHT_MODULE` can point at an existing Playwright installation. All provider responses in that test are simulated.

## Deployment

This follow-up is on the existing Nebula and FNPH Raid review branches. The live sites are unchanged until those changes are merged and deployed. Deploy Nebula's Functions with existing OPENAI_API_KEY and TUTOR_CODE. Optional STUDY_SEARCH_MODEL defaults to gpt-4.1-mini for research; STUDY_MODEL remains the configured pack-generation model. The game uses the fixed HTTPS Nebula study endpoint. The study endpoint permits the GitHub Pages origin and authenticated requests from the standalone file; tutor voice access remains restricted separately.

- Nebula: https://github.com/Olemabu/nebula-study/pull/2
- FNPH Raid: https://github.com/Olemabu/fnph-raid/pull/1
- Web-search integration reference: https://developers.openai.com/api/docs/guides/tools-web-search
