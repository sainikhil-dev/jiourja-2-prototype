# Voice recording sheet — "FACTORY KA ASLI MAALIK!"

Record **one file per line** in ElevenLabs. Name each file with the exact ID shown below, as `<id>.mp3` or `<id>.wav`.
The full list, with the same text, lives in `src/timeline/script.ts`.

**Recommended:** generate with ElevenLabs' *with-timestamps* endpoint and save the `alignment` object next to the audio as `<id>.alignment.json`.
That gives character-level timings for the Hindi text, which drive accurate mouth shapes. Without it, lip-sync falls back to an approximation, and the preview will say so.

Leave about 0.2 s of room tone at the start and end of each take. Don't speed up or trim takes to fit: the timeline is laid out around your real durations.

| # | File ID | Character | Paste into ElevenLabs | Direction |
|---|---|---|---|---|
| 1 | `s1_raju_kaun` | Raju (worker) | सर... ये कौन है? | Frightened whisper, leaning to the boss. Breathy, fast. |
| 2 | `s1_owner_maalik` | Owner | हमारी फैक्टरी का... असली मालिक! | Helpless, defeated half-whisper. Tiny pause before "असली", sigh on "मालिक". |
| 3 | `s2_bill_kamai` | Bill | [laughs] मशीनें तुम्हारी... मेहनत तुम्हारी... लेकिन कमाई... मेरी! | Deep, theatrical filmy villain. Slow and smug, savouring each pause. Comic, not scary. |
| 4 | `s2_owner_vasooli` | Owner | अरे! ये बिजली का बिल है... या वसूली गैंग? | Exasperated outburst, pitch rising on "वसूली गैंग". |
| 5 | `s3_friend_solar` | Friend | तो सोलर लगवा लो! | Casual, breezy, as if it's obvious. Smile in the voice. |
| 6 | `s3_owner_lakhs` | Owner | लाखों रुपये कहाँ से लाऊँ? ये बिल तो मेरी कुर्सी भी ले गया! | Money anxiety turning into a comic whine. |
| 7 | `s4_friend_isiliye` | Friend | इसीलिए है... जियोऊर्जा टू पॉइंट ओ! | Confident, knowing; a beat of suspense before the name. The turning point. |
| 8 | `s4_friend_invest` | Friend | योग्य छोटे कारखानों के लिए, सोलर में निवेश करेगा रिलायंस! | Upbeat, clear, persuasive. Lean on "निवेश करेगा". |
| 9 | `s4_friend_install` | Friend | इंस्टॉलेशन और मेंटेनेंस भी संभालेगा। | Reassuring, ticking items off on his fingers. |
| 10 | `s4_friend_pay` | Friend | तुम सोलर बिजली के इस्तेमाल का भुगतान करना! | Warm, friendly punch on "भुगतान करना". |
| 11 | `s5_owner_kaise` | Owner | लेकिन... शुरू कैसे करूँ? | Eager now, leaning in, hopeful. |
| 12 | `s5_friend_steps` | Friend | बिल अपलोड करो! एआई से सही सिस्टम चुनो। साइट और क्रेडिट चेक... फिर, सोलर लगवाओ! | Brisk, rhythmic, tapping the phone on each step; triumphant at the end. |
| 13 | `s6_bill_kursi` | Bill | [nervously] तो... मेरी कुर्सी? | Same villain voice, now tiny and nervous; voice cracks on "कुर्सी". |
| 14 | `s6_owner_dhoondh` | Owner | [playfully] अब अपनी कुर्सी ढूँढ! | Playful, triumphant, a little smug. The punchline. |
| 15 | `s6_vo_tagline` | Announcer | जियोऊर्जा टू पॉइंट ओ. छोटे कारोबारों की... बड़ी ऊर्जा! | Warm, powerful Indian ad voice. Unhurried, proud. |

Voice casting:
- **Owner:** Indian male, 40–45. Slightly frustrated, natural conversational Hindi, expressive and comedic.
- **Friend:** Indian male, 30–40. Witty, relaxed, confident.
- **Bill:** deep, arrogant, theatrical villain. Funny rather than frightening.
- **Raju:** young Indian male worker, timid.
- **Announcer:** warm, powerful Indian advertising voice.

The `[laughs]`, `[nervously]` and `[playfully]` tags are ElevenLabs v3 audio tags. With an older model, remove them and act the emotion with the voice settings instead.
"2.0" is written out as "टू पॉइंट ओ" so it's pronounced the same way in every take.
