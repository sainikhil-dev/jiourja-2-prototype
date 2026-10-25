# FACTORY KA ASLI MAALIK! — JioUrja 2.0 animated TV commercial

A 2D cartoon commercial, built with **Remotion + React + TypeScript**. Every character is an original SVG cut-out rig.

**Status: Stage 1 (style approval).** This stage has the cast, the rigs, the factory set and a ~10.8 s playable preview of Scene 1.
Voices are **not** in yet: the preview's mouth timing is a scratch guess from the Hindi text and is labelled that way on screen. The music and SFX are synthesised placeholders.

## Run it

```bash
cd commercial
npm install
npm run preview          # browser player: Play / Pause / Seek / frame-step / Replay
npm run studio           # Remotion Studio (timeline, scrubbing, props)
npm run render:preview   # → out/preview-10s.mp4 (1920×1080, 30 fps, H.264 + AAC)
npm run sfx              # regenerate placeholder SFX/music in public/audio/
```

## Layout

| Path | What it holds |
|---|---|
| `src/characters/` | Rigs. `Human.tsx` is the shared skeleton for the owner, friend and workers. `Owner.tsx`, `Friend.tsx`, `Workers.tsx` and `Bill.tsx` hold the designs. `parts.tsx` holds eyes, brows, the parametric mouth, hands and sweat. |
| `src/rig/keyframes.ts` | Pose-to-pose keyframe engine with easing (back, anticipate, elastic, hold), plus blinks, breathing and shake. |
| `src/camera/Camera.tsx` | Multiplane camera with parallax layers, cut keys and shake. |
| `src/environment/` | The factory set and the chair. |
| `src/audio/visemes.ts` | Mouth-shape alphabet (Rhubarb-compatible A–H, X) and the Devanagari → viseme mapping, with scratch and timestamp-aligned modes. |
| `src/audio/Soundtrack.tsx` | Dialogue, SFX and music playback, with automatic ducking under speech. |
| `src/timeline/script.ts` | Every line of dialogue: speaker, ElevenLabs text, direction, file ID. |
| `src/timeline/beats.ts` | The audio-first timeline. Line beats take their length from the real audio file (`audio-manifest.json`), and all acting is keyed relative to beats. |
| `src/scenes/` | `Scene1Boss.tsx` and the animated `CharacterSheet.tsx`. |
| `VOICE_SCRIPT.md` | Recording sheet for ElevenLabs. |

## How sync will work (Stage 2)

1. Put each take in `public/audio/dialogue/<line id>.mp3|wav`. Optionally add `<line id>.alignment.json` from ElevenLabs *with-timestamps*.
2. An analysis script measures each file's duration, speech onset and end, and pauses, then writes mouth cues to `src/timeline/audio-manifest.json`. Cues are labelled by source, in order of preference:
   - ElevenLabs alignment (accurate)
   - Rhubarb Lip Sync's phonetic recogniser
   - a clearly-labelled text + energy approximation
3. `resolveBeats()` lays every scene out around those real durations. Gestures, cuts and mouth shapes move with the audio, and mouths close whenever the voice stops. Nothing is time-stretched.

Fonts: Baloo 2 by Ek Type, SIL Open Font License (`public/fonts/OFL-Baloo2.txt`).
