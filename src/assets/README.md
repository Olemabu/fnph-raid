# Kestrel rendered assets

Original AI-generated artwork commissioned for FNPH Raid in this chat, using the approved Kestrel / 01 concept as reference. No third-party game assets.

- `kestrel-hangar.webp`: transparent three-quarter render for hangar presentation.
- `kestrel-flight.webp`: transparent orthographic top-down render for gameplay and loadout preview.

Generated with the built-in image generation tool on 1 Nov 2026. Encoded as WebP with preserved alpha for embedding into the self-contained HTML. Original generated PNGs remain in the local Codex generated-images directory. These are rendered raster sprites, not vector approximations or a runtime 3D model. Engine trails, muzzle flashes and shield feedback are animated by the renderer. Both build scripts embed the assets and startup waits for decoding before enabling play.
