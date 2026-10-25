/** Loads Baloo 2 (SIL OFL, by Ek Type) — a rounded Devanagari + Latin face that suits Indian cartoon branding. */
import { continueRender, delayRender, staticFile } from 'remotion';

export const FONT = "'Baloo 2', 'FreeSans', sans-serif";

const faces: Array<[string, string, string]> = [];
for (const w of ['500', '700', '800'])
  for (const [subset, range] of [
    ['devanagari', 'U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+25CC, U+A830-A839, U+A8E0-A8FF'],
    ['latin', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
  ])
    faces.push([w, `fonts/baloo-2-${subset}-${w}-normal.woff2`, range]);

let loaded = false;
export function loadFonts() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('Loading Baloo 2');
  Promise.all(
    faces.map(([weight, file, unicodeRange]) => {
      const f = new FontFace('Baloo 2', `url(${staticFile(file)}) format('woff2')`, { weight, unicodeRange });
      return f.load().then((ff) => document.fonts.add(ff));
    }),
  )
    .catch((e) => console.error('font load failed', e))
    .finally(() => continueRender(handle));
}
