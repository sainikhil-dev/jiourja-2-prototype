/** Beat sheets for Scenes 2–5. Line beats take their length from the recorded voice. */
import type { Beat } from './beats';

/** SCENE 2 — THE SOLAR PROBLEM */
export const SCENE2_BEATS: Beat[] = [
  { id: 'enter', frames: 14 }, // Vicky strolls in from the right
  { id: 'l4', line: 's2_friend_solar', lead: 0, tail: 6 }, // "अरे भाई! तो सोलर लगवा लो ना!"
  { id: 'l5', line: 's2_owner_lakhs', lead: 6, tail: 6 }, // "लाखों रुपये कहाँ से लाऊँ? ये बिल तो मेरी कुर्सी भी ले गया!"
  { id: 'smug', frames: 26 }, // comic silence: the Bill reclines, chair creaks; Vicky smiles knowingly
];

/** SCENE 3 — THE JIOURJA REVEAL */
export const SCENE3_BEATS: Beat[] = [
  { id: 'l6', line: 's3_friend_isiliye', lead: 4, tail: 10 }, // "इसीलिए तो आया है... जियोऊर्जा टू पॉइंट ज़ीरो!"
  { id: 'l7', line: 's3_owner_accha', lead: 4, tail: 6 }, // "अच्छा! ये करेगा क्या?"
  { id: 'l8', line: 's3_friend_explain', lead: 6, tail: 12 }, // rooftop solar → the Bill shrinks
];

/** SCENE 4 — HOW IT WORKS */
export const SCENE4_BEATS: Beat[] = [
  { id: 'l9', line: 's4_owner_kaise', lead: 4, tail: 6 }, // "वाह! लेकिन शुरू कैसे करूँ?"
  { id: 'l10', line: 's4_friend_steps', lead: 10, tail: 10 }, // the phone: upload → AI → checks → install → monitor
  { id: 'slide', frames: 30 }, // too small for the throne now: he slips off
];

/** SCENE 5 — THE PUNCHLINE + BRAND */
export const SCENE5_BEATS: Beat[] = [
  { id: 'l11', line: 's5_bill_kursi', lead: 6, tail: 8 }, // "तो... मेरी कुर्सी?"
  { id: 'l12', line: 's5_owner_dhoondh', lead: 4, tail: 2 }, // "[laughs] अब अपनी कुर्सी ढूँढ!"
  { id: 'roll', frames: 36 }, // he rolls the chair away. Ba-dum-tss.
  { id: 'l13', line: 's5_friend_tagline', lead: 6, tail: 10 }, // "जियोऊर्जा टू पॉइंट ज़ीरो! छोटे कारोबारों की बड़ी ऊर्जा!"
  { id: 'endcard', frames: 96 }, // brand reveal after all dialogue
];
