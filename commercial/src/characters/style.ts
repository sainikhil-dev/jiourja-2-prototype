/** Shared ink & paint for every asset, so all characters read as one show. */
export const INK = '#2A1A14';
export const LINE = 4.5; // base outline width in character units
export const MOUTH_DARK = '#5A1A1D';
export const TONGUE = '#E4707A';
export const TEETH = '#FFFDF4';
export const EYE_WHITE = '#FFFDF7';
export const GOLD = '#F2B632';
export const GOLD_SHADE = '#C98A12';

export const SKIN = {
  owner: { base: '#D39466', shade: '#B0734B', blush: '#E07A63' },
  friend: { base: '#BE8257', shade: '#9A6340', blush: '#D9705A' },
  raju: { base: '#A86C44', shade: '#86522F', blush: '#C9644E' },
  pappu: { base: '#C4875A', shade: '#A06A40', blush: '#D86F5A' },
};

/** Make a clip/gradient id safe for url(#...) */
export const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '');
