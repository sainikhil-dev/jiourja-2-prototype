# FACTORY KA ASLI MAALIK! — JioUrja 2.0 animated TV commercial

A 2D cartoon commercial built with **Remotion + React + TypeScript**. Every character is an original SVG cut-out rig, and lip-sync is driven by the recorded ElevenLabs voices.

**Finished cut:** `deliverables/final/JioUrja2_Factory_Ka_Asli_Maalik_1080p.mp4` (69.5 s, 1920×1080, 30 fps, H.264, AAC 256 kb/s, peak -2.2 dBFS).
**QA cut:** `deliverables/final/JioUrja2_QA_lipsync_overlay_540p.mp4` is the same film with the speaker, the line and its timing source shown on screen.

> **Placeholder audio:** the music and SFX are synthesised placeholders (`npm run sfx`). Drop a final mix into `public/audio/music/` or `public/audio/sfx/` with the same file name and re-render; no code changes are needed.

## Run it

```bash
cd commercial
npm install
npm run preview        # browser player: Play / Pause / Seek / frame-step / Replay / captions
npm run studio         # Remotion Studio: timeline, scrubbing, every scene as its own composition
npm run render         # → out/JioUrja2_Factory_Ka_Asli_Maalik_1080p.mp4 (render + -1 dBFS limiter)
npm run render:qa      # → out/commercial_QA_540p.mp4 with the caption/QA overlay
npm run qa:sync        # renders the dialogue stem and writes SYNC_QA.md
```

## The story as built

| Scene | Starts at | What happens |
|---|---|---|
| 1 | 0.0 s | The machines die. The shutter slams up on a villain sting. **Bill Bhai** stomps in; everyone snaps to attention and Raju drops his crate. He takes THE chair, spins and crosses his legs. Owner: "अरे! मेरी कुर्सी पर ये कौन बैठ गया?" Bill: "[laughs] मैं हूँ... बिजली का बिल! मशीनें तुम्हारी... मेहनत तुम्हारी... लेकिन कमाई मेरी!" He points at the machines, then at the owner, and **grows** on "मेरी!", when **₹8–14/यूनिट** (illustrative) slams in. Owner: "...या वसूली गैंग?" The workers swap terrified looks. |
| 2 | 20.2 s | Vicky strolls in: "अरे भाई! तो सोलर लगवा लो ना!" Owner: palms up on "लाखों रुपये कहाँ से लाऊँ?", hands on head, then points: "ये बिल तो मेरी कुर्सी भी ले गया!" The Bill waves smugly. Comic silence; the throne creaks. |
| 3 | 28.1 s | "इसीलिए तो आया है... **जियोऊर्जा टू पॉइंट ज़ीरो!**" Light bursts, the emblem pops, the villain grade lifts and the music turns heroic. "अच्छा! ये करेगा क्या?" Cutaway: panels pop onto the factory roof, a cable runs and a brush sweeps the array (installation and maintenance). Back inside, sunlight floods in, the meter slows, and the Bill **shrinks** on "सिर्फ", "इस्तेमाल" and "भुगतान". |
| 4 | 43.9 s | "वाह! लेकिन शुरू कैसे करूँ?" Vicky holds up his phone, and a magnified app screen steps with his words: bill upload → AI system sizing → site and credit checks → installation → live monitoring. The Bill peeks at it, shrinks on each tick, and slips off the throne. |
| 5 | 55.2 s | The tiny Bill: "तो... मेरी कुर्सी?" The owner laughs: "अब अपनी कुर्सी ढूँढ!" and shoves the chair away (ba-dum-tss). Vicky: "जियोऊर्जा टू पॉइंट ज़ीरो! छोटे कारोबारों की बड़ी ऊर्जा!" while the Bill tiptoes off. End card at 66.3 s, after all dialogue, with subtext and disclosure. |

Running time is 69.5 s. The recorded voices alone take 58 s, so this is the tightest cut that keeps the entrance and the end card. The voices are never sped up or trimmed.

## Lip-sync: how it is timed

1. **Source.** `public/audio/source/full_take.mp3` is your single ElevenLabs take. `src/timeline/lines.json` lists the 13 speaking turns exactly as recorded. The scripted owner "अरे भाई!" isn't in the take, so it is left out (noted in `AUDIO_REPORT.md`).
2. **`npm run analyze-audio`**
   - **Cutting.** The take is cut into one file per turn. Each cut is snapped to a real pause in the audio; whole-take forced alignment only decides which pause.
   - **Alignment.** Each turn is split at its own pauses, and each phrase is force-aligned against its exact Hindi text with **Echogarden** (eSpeak-NG Hindi reference + DTW on MFCCs). This gives measured start and end times for every word and every phone.
   - **Laughs.** Opening laughs (`[laughs]`) are detected and get a laughing mouth instead of words.
   - **Mouth shapes.** Phones map to Rhubarb-style mouth shapes (A–H, X). The recording's own loudness has the final say: any silent stretch closes the mouth.
   - **Cross-check.** Word onsets are compared with an independent Whisper (small) transcription. The results go to `AUDIO_REPORT.md` and `src/timeline/audio-manifest.json`.
3. **Timeline.** `src/timeline/beats.ts` lays every scene out around the measured voice spans. Gestures are keyed to word times (`wordAt`), for example the bill pointing at the machines exactly on "मशीनें". Re-recording a line re-times everything with it.
4. **QA.** `npm run qa:sync` renders the dialogue stem and checks it against the mouths frame by frame. Current result: 0 frames of mouth movement over silence, 0 frames after a line ends, 0 overlapping speakers, and voice-to-mouth onset within 0–2 frames on every line.

This is forced alignment computed from the audio plus your text. ElevenLabs' own timestamp data wasn't available: the take was exported without it, and their API is blocked from this container.

### Replacing or re-recording voices

- **Separate files.** Put `public/audio/dialogue/<line id>.wav` (IDs are in `lines.json`), delete or rename `public/audio/source/full_take.mp3`, then run `npm run analyze-audio && npm run render`.
- **A new single take.** Replace `full_take.mp3`. If you have a new Whisper reference, also regenerate `full_take.whisper.json` with `scripts/whisper-transcribe.py` (needs `faster-whisper` and a Whisper model). It is optional and only refines phrase anchors and the QA check.
- **Changed wording.** Edit `lip` in `lines.json` so the alignment uses the words actually spoken.

## Layout

| Path | Contents |
|---|---|
| `src/characters/` | Rigs: `Human.tsx` (shared skeleton + hand forward kinematics), `Owner.tsx`, `Friend.tsx`, `Workers.tsx` (Raju, Pappu), `Bill.tsx`; `parts.tsx` (eyes, brows, parametric mouth, hands, sweat). |
| `src/rig/keyframes.ts` | Pose-to-pose keyframes with easing (back, anticipate, elastic, hold), blinks, breathing, shake. |
| `src/camera/Camera.tsx` | Multiplane parallax camera with cut keys and shake. |
| `src/environment/` | Factory interior, the throne-chair, the rooftop exterior. |
| `src/brand/` | Original JioUrja 2.0 concept emblem/wordmark and the illustrated phone app. |
| `src/scenes/` | `Stage.tsx` (renders the set + cast from state), Scenes 1–5, end card, model sheet, QA overlay. |
| `src/Commercial.tsx` | The master sequence and continuous score (ducked under speech). |
| `src/timeline/` | `lines.json`, scene beat sheets, `beats.ts` (audio-first timeline), `audio-manifest.json`. |
| `scripts/` | `analyze-audio.mjs`, `qa-sync.tsx`, `master.sh`, `generate-placeholder-audio.mjs`, `whisper-transcribe.py`. |

Credits and licences: Baloo 2 by Ek Type (SIL OFL); Echogarden (MIT/GPL-3.0, analysis-time tool only, not shipped in the video); eSpeak-NG (GPL-3.0, same); OpenAI Whisper small weights (MIT; npm copy `@skillninja/shortmovie-telop-model-*`, checksum verified).

JioUrja 2.0 is a proposed concept. The emblem is an original illustration, not an official Reliance or Jio mark.
