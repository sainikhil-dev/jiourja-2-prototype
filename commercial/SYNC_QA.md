# Lip-sync QA — finished cut

Measured on the **rendered dialogue stem** (`dialogue.wav`): the exact audio the viewer hears, compared frame by frame (30 fps) with the mouth shapes the timeline drives. Voice counts as audible above -37.0 dBFS (30 dB under the dialogue peak).

**Film length:** 69.53 s (2086 frames). Scene starts: S1 0.00 s · S2 20.23 s · S3 28.07 s · S4 43.87 s · S5 55.23 s.

| Check | Result |
|---|---|
| Frames where a mouth is open but no voice is audible (±1 frame) | **0**  |
| Frames where a mouth keeps moving after its line's audio ends | **0** |
| Frames where two characters' mouths move at once | **0** |
| Last line ends before the end card | 66.00 s vs card at 66.33 s |

Per line: voice span vs mouth span on the master timeline. Δ is in frames (+ means the mouth is later than the voice). "Voiced / open" counts the frames inside the line's speech where the voice is audible vs where the mouth is open. Brief closures for म/ब/प and stop consonants keep "open" a little below "voiced".

| Line | Speaker | Voice audible (s) | Mouth moving (s) | Onset Δ | Offset Δ | Voiced / open frames | Timing source |
|---|---|---|---|---|---|---|---|
| `s1_owner_kaun` | owner | 5.63–8.10 | 5.63–8.10 | +0 | +0 | 57 / 53 | forced-alignment (phrase-by-pause) |
| `s1_bill_kamai` | bill | 8.37–16.67 | 8.40–16.63 | +1 | -1 | 168 / 139 | forced-alignment (phrase-by-pause+whisper-anchor+laugh-split) |
| `s1_owner_vasooli` | owner | 17.07–19.80 | 17.10–19.77 | +1 | -1 | 64 / 60 | forced-alignment (phrase-by-pause) |
| `s2_friend_solar` | friend | 20.67–23.00 | 20.73–23.00 | +2 | +0 | 62 / 58 | forced-alignment (phrase-by-pause) |
| `s2_owner_lakhs` | owner | 23.37–27.03 | 23.43–27.00 | +2 | -1 | 85 / 90 | forced-alignment (phrase-by-pause) |
| `s3_friend_isiliye` | friend | 28.20–31.33 | 28.20–31.33 | +0 | +0 | 82 / 80 | forced-alignment (phrase-by-pause) |
| `s3_owner_accha` | owner | 31.80–33.57 | 31.83–33.53 | +1 | -1 | 34 / 31 | forced-alignment (phrase-by-pause) |
| `s3_friend_explain` | friend | 33.90–43.47 | 33.93–43.47 | +1 | +0 | 243 / 238 | forced-alignment (phrase-by-pause+whisper-anchor) |
| `s4_owner_kaise` | owner | 43.97–46.13 | 44.00–46.10 | +1 | -1 | 46 / 43 | forced-alignment (phrase-by-pause+whisper-anchor) |
| `s4_friend_steps` | friend | 46.60–53.93 | 46.63–53.90 | +1 | -1 | 173 / 171 | forced-alignment (phrase-by-pause) |
| `s5_bill_kursi` | bill | 55.43–57.23 | 55.43–57.27 | +0 | +1 | 36 / 38 | forced-alignment (phrase-by-pause) |
| `s5_owner_dhoondh` | owner | 57.63–60.10 | 57.67–60.10 | +1 | +0 | 53 / 41 | forced-alignment (phrase-by-pause+laugh-chunk) |
| `s5_friend_tagline` | friend | 61.53–66.13 | 61.57–66.00 | +1 | -4 | 108 / 92 | forced-alignment (phrase-by-pause+whisper-anchor) |
