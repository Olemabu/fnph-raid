# FNPH Raid Android

Build the game with `python build.py`, then run `node scripts/build-apk.mjs` with Android SDK platform 35/build tools 34 and JDK 17. Set FNPH_KEYSTORE_PASS to the saved signing password. The private signing key defaults to ~/.codex/signing/fnph-raid.keystore; never commit it. Back it up for future updates.

The signed APK bundles the complete offline game, including the MCQ map. Internet is required only for online study generation and external links. API credentials remain on the Nebula server; no API secret is bundled. Android progress is stored separately from Chrome progress. Use the game's existing save import to transfer progress. The wrapper serves one bundled document over a fixed HTTPS origin, disables file/content access and cleartext traffic, exposes no JavaScript-to-native bridge, and opens external pages in the browser.
