# Voice script — as recorded

The film uses the single ElevenLabs take in `public/audio/source/full_take.mp3`.
`npm run analyze-audio` cuts it into these 13 turns and aligns each one. The exact texts and IDs are in `src/timeline/lines.json`.

| # | Line ID | Speaker | Spoken text (used for alignment) |
|---|---|---|---|
| 01 | `s1_owner_kaun` | Owner | अरे! मेरी कुर्सी पर ये कौन बैठ गया? |
| 02 | `s1_bill_kamai` | Bill | [laughs] मैं हूँ... बिजली का बिल! मशीनें तुम्हारी... मेहनत तुम्हारी... लेकिन कमाई मेरी! |
| 03 | `s1_owner_vasooli` | Owner | ये बिजली का बिल है... या वसूली गैंग? *(the scripted "अरे भाई!" is not in the take)* |
| 04 | `s2_friend_solar` | Friend | अरे भाई! तो सोलर लगवा लो ना! |
| 05 | `s2_owner_lakhs` | Owner | लाखों रुपये कहाँ से लाऊँ? ये बिल तो मेरी कुर्सी भी ले गया! |
| 06 | `s3_friend_isiliye` | Friend | इसीलिए तो आया है... जियोऊर्जा टू पॉइंट ज़ीरो! |
| 07 | `s3_owner_accha` | Owner | अच्छा! ये करेगा क्या? |
| 08 | `s3_friend_explain` | Friend | सोलर में निवेश करेगा रिलायंस! इंस्टॉलेशन और मेंटेनेंस भी वही संभालेगा! और योग्य कारखाने सिर्फ इस्तेमाल की हुई सोलर बिजली का भुगतान करेंगे! |
| 09 | `s4_owner_kaise` | Owner | वाह! लेकिन शुरू कैसे करूँ? |
| 10 | `s4_friend_steps` | Friend | बिजली का बिल अपलोड करो! एआई से सही सिस्टम चुनो। साइट और क्रेडिट चेक करवाओ... और फिर लगवाओ सोलर! |
| 11 | `s5_bill_kursi` | Bill | तो... मेरी कुर्सी? |
| 12 | `s5_owner_dhoondh` | Owner | [laughs] अब अपनी कुर्सी ढूँढ! |
| 13 | `s5_friend_tagline` | Friend | जियोऊर्जा टू पॉइंट ज़ीरो! छोटे कारोबारों की बड़ी ऊर्जा! |

To give characters distinct voices later (recommended for the Bill), export just those lines as separate files named by line ID into `public/audio/dialogue/`. Then run `npm run analyze-audio && npm run render`; every gesture and cut re-times to the new takes.
