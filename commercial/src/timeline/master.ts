/** The master timeline: scene order, offsets, and every line placed on it. */
import { Scene1Boss, S1 } from '../scenes/Scene1Boss';
import { Scene2Problem, S2 } from '../scenes/Scene2Problem';
import { Scene3Reveal, S3 } from '../scenes/Scene3Reveal';
import { Scene4App, S4 } from '../scenes/Scene4App';
import { Scene5Punchline, S5 } from '../scenes/Scene5Punchline';
import { offsetBeats, type Resolved } from './beats';

export const SCENES = [
  { id: 'S1', C: Scene1Boss, B: S1 },
  { id: 'S2', C: Scene2Problem, B: S2 },
  { id: 'S3', C: Scene3Reveal, B: S3 },
  { id: 'S4', C: Scene4App, B: S4 },
  { id: 'S5', C: Scene5Punchline, B: S5 },
] as const;

export const SCENE_OFFSETS: number[] = [];
{
  let o = 0;
  for (const s of SCENES) {
    SCENE_OFFSETS.push(o);
    o += s.B.__total.end;
  }
  SCENE_OFFSETS.push(o);
}
export const TOTAL_FRAMES = SCENE_OFFSETS[SCENE_OFFSETS.length - 1];

/** Every line of the film on the master timeline (for ducking and QA). */
export const MASTER: Resolved = (() => {
  const all: Record<string, Resolved[string]> = {};
  SCENES.forEach((s, i) => {
    const ob = offsetBeats(s.B, SCENE_OFFSETS[i]);
    for (const [k, v] of Object.entries(ob)) if (k !== '__total') all[`${s.id}.${k}`] = v;
  });
  all.__total = { id: '__total', start: 0, end: TOTAL_FRAMES };
  return all as Resolved;
})();

