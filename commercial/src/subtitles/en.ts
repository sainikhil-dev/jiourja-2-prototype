/**
 * English subtitles, written for the comedy and pace of the Hindi rather than
 * word for word. Each cue covers a range of spoken words (inclusive word
 * indices into the line's aligned words), so its timing comes from the
 * measured audio. "\n" is an intentional line break (max two lines).
 */
export type CueDef = { line: string; words: [number, number]; text: string };

export const EN_CUES: CueDef[] = [
  // Scene 1
  { line: 's1_owner_kaun', words: [0, 0], text: 'Hey!' },
  { line: 's1_owner_kaun', words: [1, 7], text: "Who's that sitting in MY chair?" },
  { line: 's1_bill_kamai', words: [0, 1], text: "It's me..." },
  { line: 's1_bill_kamai', words: [2, 4], text: '...the Electricity Bill!' },
  { line: 's1_bill_kamai', words: [5, 6], text: 'The machines are yours...' },
  { line: 's1_bill_kamai', words: [7, 8], text: 'The sweat is yours...' },
  { line: 's1_bill_kamai', words: [9, 11], text: 'But the profits are MINE!' },
  { line: 's1_owner_vasooli', words: [0, 4], text: 'Is this an electricity bill...' },
  { line: 's1_owner_vasooli', words: [5, 7], text: '...or an extortion gang?' },
  // Scene 2
  { line: 's2_friend_solar', words: [0, 1], text: 'Come on, bro!' },
  { line: 's2_friend_solar', words: [2, 6], text: 'Just get solar!' },
  { line: 's2_owner_lakhs', words: [0, 4], text: 'Where will I get\nlakhs of rupees?' },
  { line: 's2_owner_lakhs', words: [5, 12], text: 'This bill has even\ntaken my chair!' },
  // Scene 3
  { line: 's3_friend_isiliye', words: [0, 3], text: "That's why\nhere comes..." },
  { line: 's3_friend_isiliye', words: [4, 7], text: 'JioUrja 2.0!' },
  { line: 's3_owner_accha', words: [0, 0], text: 'Really?' },
  { line: 's3_owner_accha', words: [1, 3], text: 'So what will it do?' },
  { line: 's3_friend_explain', words: [0, 4], text: 'Reliance will invest\nin the solar!' },
  { line: 's3_friend_explain', words: [5, 10], text: "They'll handle installation\nand maintenance too!" },
  { line: 's3_friend_explain', words: [11, 22], text: 'And eligible factories pay only\nfor the solar power they use!' },
  // Scene 4
  { line: 's4_owner_kaise', words: [0, 0], text: 'Wow!' },
  { line: 's4_owner_kaise', words: [1, 4], text: 'But how do I get started?' },
  { line: 's4_friend_steps', words: [0, 4], text: 'Upload your electricity bill!' },
  { line: 's4_friend_steps', words: [5, 9], text: 'Choose the right system with AI.' },
  { line: 's4_friend_steps', words: [10, 14], text: 'Get the site and\ncredit checked...' },
  { line: 's4_friend_steps', words: [15, 18], text: '...and then get solar installed!' },
  // Scene 5
  { line: 's5_bill_kursi', words: [0, 0], text: 'So...' },
  { line: 's5_bill_kursi', words: [1, 2], text: '...what about my chair?' },
  { line: 's5_owner_dhoondh', words: [0, 3], text: 'Now go find your own chair!' },
  { line: 's5_friend_tagline', words: [0, 3], text: 'JioUrja 2.0!' },
  { line: 's5_friend_tagline', words: [4, 8], text: 'Big energy for\nsmall businesses!' },
];
