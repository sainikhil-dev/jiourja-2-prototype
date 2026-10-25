/**
 * The full dialogue for "FACTORY KA ASLI MAALIK!", one entry per speaking
 * turn. Each turn becomes ONE audio file from ElevenLabs:
 *
 *   public/audio/dialogue/<id>.mp3   (or .wav)
 *   public/audio/dialogue/<id>.alignment.json   (optional, recommended —
 *       the `alignment` object from ElevenLabs /with-timestamps)
 *
 * `tts`     — exactly what to paste into ElevenLabs (audio tags allowed).
 * `lip`     — the spoken words only, used to choose mouth shapes. Keep it in
 *             sync with `tts` minus the tags.
 * `scratch` — guessed seconds, used ONLY until the real file exists.
 */
export type Speaker = 'owner' | 'friend' | 'bill' | 'raju' | 'pappu' | 'announcer';

export type Line = {
  id: string;
  scene: number;
  speaker: Speaker;
  tts: string;
  lip: string;
  direction: string;
  scratch: number;
};

export const LINES: Line[] = [
  {
    id: 's1_raju_kaun',
    scene: 1,
    speaker: 'raju',
    tts: 'सर... ये कौन है?',
    lip: 'सर... ये कौन है?',
    direction: 'Frightened whisper, leaning to the boss. Breathy, fast, eyes on the intruder.',
    scratch: 1.5,
  },
  {
    id: 's1_owner_maalik',
    scene: 1,
    speaker: 'owner',
    tts: 'हमारी फैक्टरी का... असली मालिक!',
    lip: 'हमारी फैक्टरी का... असली मालिक!',
    direction: 'Helpless, defeated, half-whisper. Tiny pause before "असली", sigh on "मालिक".',
    scratch: 2.1,
  },
  {
    id: 's2_bill_kamai',
    scene: 2,
    speaker: 'bill',
    tts: '[laughs] मशीनें तुम्हारी... मेहनत तुम्हारी... लेकिन कमाई... मेरी!',
    lip: 'हा हा हा... मशीनें तुम्हारी... मेहनत तुम्हारी... लेकिन कमाई... मेरी!',
    direction: 'Deep, theatrical filmy villain. Slow and smug, savouring each pause. Comic, not scary.',
    scratch: 5.0,
  },
  {
    id: 's2_owner_vasooli',
    scene: 2,
    speaker: 'owner',
    tts: 'अरे! ये बिजली का बिल है... या वसूली गैंग?',
    lip: 'अरे! ये बिजली का बिल है... या वसूली गैंग?',
    direction: 'Exasperated outburst to the workers, rising pitch on "वसूली गैंग".',
    scratch: 2.6,
  },
  {
    id: 's3_friend_solar',
    scene: 3,
    speaker: 'friend',
    tts: 'तो सोलर लगवा लो!',
    lip: 'तो सोलर लगवा लो!',
    direction: 'Casual, breezy, like it is obvious. Slight smile in the voice.',
    scratch: 1.3,
  },
  {
    id: 's3_owner_lakhs',
    scene: 3,
    speaker: 'owner',
    tts: 'लाखों रुपये कहाँ से लाऊँ? ये बिल तो मेरी कुर्सी भी ले गया!',
    lip: 'लाखों रुपये कहाँ से लाऊँ? ये बिल तो मेरी कुर्सी भी ले गया!',
    direction: 'Financial anxiety turning into a comic whine; points at the chair on the second half.',
    scratch: 3.8,
  },
  {
    id: 's4_friend_isiliye',
    scene: 4,
    speaker: 'friend',
    tts: 'इसीलिए है... जियोऊर्जा टू पॉइंट ओ!',
    lip: 'इसीलिए है... जियोऊर्जा टू पॉइंट ओ!',
    direction: 'Confident, knowing smile, a beat of suspense before the name. The turning point.',
    scratch: 2.6,
  },
  {
    id: 's4_friend_invest',
    scene: 4,
    speaker: 'friend',
    tts: 'योग्य छोटे कारखानों के लिए, सोलर में निवेश करेगा रिलायंस!',
    lip: 'योग्य छोटे कारखानों के लिए, सोलर में निवेश करेगा रिलायंस!',
    direction: 'Upbeat, clear, persuasive. Emphasis on "निवेश करेगा".',
    scratch: 3.4,
  },
  {
    id: 's4_friend_install',
    scene: 4,
    speaker: 'friend',
    tts: 'इंस्टॉलेशन और मेंटेनेंस भी संभालेगा।',
    lip: 'इंस्टॉलेशन और मेंटेनेंस भी संभालेगा।',
    direction: 'Reassuring, ticking items off on his fingers.',
    scratch: 2.3,
  },
  {
    id: 's4_friend_pay',
    scene: 4,
    speaker: 'friend',
    tts: 'तुम सोलर बिजली के इस्तेमाल का भुगतान करना!',
    lip: 'तुम सोलर बिजली के इस्तेमाल का भुगतान करना!',
    direction: 'Warm, friendly punch on "भुगतान करना".',
    scratch: 2.6,
  },
  {
    id: 's5_owner_kaise',
    scene: 5,
    speaker: 'owner',
    tts: 'लेकिन... शुरू कैसे करूँ?',
    lip: 'लेकिन... शुरू कैसे करूँ?',
    direction: 'Eager now, leaning in, hopeful.',
    scratch: 1.6,
  },
  {
    id: 's5_friend_steps',
    scene: 5,
    speaker: 'friend',
    tts: 'बिल अपलोड करो! एआई से सही सिस्टम चुनो। साइट और क्रेडिट चेक... फिर, सोलर लगवाओ!',
    lip: 'बिल अपलोड करो! एआई से सही सिस्टम चुनो। साइट और क्रेडिट चेक... फिर, सोलर लगवाओ!',
    direction: 'Brisk, rhythmic, tapping the phone on each step; triumphant on the last.',
    scratch: 5.6,
  },
  {
    id: 's6_bill_kursi',
    scene: 6,
    speaker: 'bill',
    tts: '[nervously] तो... मेरी कुर्सी?',
    lip: 'तो... मेरी कुर्सी?',
    direction: 'Same villain voice but tiny and nervous, voice cracking on "कुर्सी".',
    scratch: 1.6,
  },
  {
    id: 's6_owner_dhoondh',
    scene: 6,
    speaker: 'owner',
    tts: '[playfully] अब अपनी कुर्सी ढूँढ!',
    lip: 'अब अपनी कुर्सी ढूँढ!',
    direction: 'Playful, triumphant, a little smug. The punchline.',
    scratch: 1.5,
  },
  {
    id: 's6_vo_tagline',
    scene: 6,
    speaker: 'announcer',
    tts: 'जियोऊर्जा टू पॉइंट ओ. छोटे कारोबारों की... बड़ी ऊर्जा!',
    lip: '',
    direction: 'Warm, powerful Indian advertising voice. Unhurried, proud.',
    scratch: 3.4,
  },
];

export const LINE = Object.fromEntries(LINES.map((l) => [l.id, l])) as Record<string, Line>;
