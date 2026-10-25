/**
 * The set: "Khurana Engineering Works", a small Indian manufacturing shed.
 * Laid out left→right along one floor so every shot is a framing of the
 * same continuous space (keeps geography and design consistent):
 *
 *   x   60–560  giant roller-shutter door
 *   x  640–1060 lathe (Pappu's station)
 *   x 1120–1340 hydraulic press
 *   x 1400–1800 open floor (Raju, the Owner)
 *   x 1850–2420 owner's corner: THE chair, desk, files, phone
 *   x 2450–2800 crates, pillar drill
 *
 * Floor line is y = 900.
 */
import React from 'react';
import { GOLD, INK, LINE } from '../characters/style';
import { FONT } from '../fonts';

export const FLOOR = 900;

// ------------------------------------------------------------ back wall (p≈0.8)
export const BackWall: React.FC<{ frame: number; meterSpeed: number }> = ({ frame, meterSpeed }) => (
  <g>
    <rect x={-900} y={-700} width={5200} height={1700} fill="#E9D7B0" />
    {/* brick texture band */}
    <g opacity={0.25}>
      {Array.from({ length: 14 }).map((_, r) =>
        Array.from({ length: 40 }).map((__, c) => (
          <rect key={`${r}-${c}`} x={-900 + c * 130 + (r % 2) * 65} y={-300 + r * 46} width={120} height={38} rx={4} fill="#D9BF8E" />
        )),
      )}
    </g>
    {/* green dado */}
    <rect x={-900} y={560} width={5200} height={440} fill="#6F8F7A" />
    <rect x={-900} y={548} width={5200} height={16} fill="#4F6E5B" />
    {/* clerestory windows */}
    {Array.from({ length: 9 }).map((_, i) => (
      <g key={i} transform={`translate(${-300 + i * 460} -160)`}>
        <rect width={300} height={170} rx={6} fill="#BFE3F2" stroke="#4C5C66" strokeWidth={10} />
        <path d="M 150 0 L 150 170 M 0 85 L 300 85" stroke="#4C5C66" strokeWidth={8} />
        <path d="M 30 20 L 90 20 L 40 70 Z" fill="#fff" opacity={0.5} />
      </g>
    ))}
    {/* pipes */}
    <rect x={-900} y={360} width={5200} height={22} fill="#9AA7AE" stroke="#56626A" strokeWidth={5} />
    <rect x={-900} y={400} width={5200} height={12} fill="#C0533A" stroke="#7B3324" strokeWidth={4} />
    {[200, 900, 1700, 2500].map((x) => (
      <g key={x}>
        <rect x={x} y={352} width={24} height={38} fill="#56626A" />
        <circle cx={x + 12} cy={340} r={16} fill="#C0392B" stroke={INK} strokeWidth={4} />
      </g>
    ))}
    {/* shop sign */}
    <g transform="translate(1400 120)">
      <rect x={-380} y={-58} width={760} height={116} rx={14} fill="#1E5AA8" stroke={INK} strokeWidth={8} />
      <rect x={-366} y={-44} width={732} height={88} rx={8} fill="none" stroke="#F5C518" strokeWidth={4} />
      <text x={0} y={22} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={62} fill="#FFF7DE">
        खुराना इंजीनियरिंग वर्क्स
      </text>
    </g>
    {/* safety sign */}
    <g transform="translate(980 470)">
      <rect x={-90} y={-40} width={180} height={80} rx={8} fill="#F5C518" stroke={INK} strokeWidth={6} />
      <text x={0} y={14} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={34} fill={INK}>
        सुरक्षा पहले
      </text>
    </g>
    {/* electricity meter — its disc spins with the bill's appetite */}
    <g transform="translate(700 450)">
      <rect x={-70} y={-90} width={140} height={180} rx={10} fill="#C9CED2" stroke={INK} strokeWidth={6} />
      <rect x={-50} y={-70} width={100} height={46} rx={4} fill="#1D2B22" />
      <text x={0} y={-36} textAnchor="middle" fontFamily="monospace" fontWeight={700} fontSize={26} fill="#59F28A">
        {String(48765 + Math.floor((frame * meterSpeed) / 3)).padStart(6, '0')}
      </text>
      <ellipse cx={0} cy={30} rx={46} ry={14} fill="#888" stroke={INK} strokeWidth={4} />
      <rect x={-4 + 40 * Math.sin(frame * 0.35 * meterSpeed)} y={22} width={8} height={16} fill="#C0392B" />
      <path d="M -40 110 L -40 150 M 0 90 L 0 150 M 40 110 L 40 150" stroke="#333" strokeWidth={8} />
    </g>
    {/* wall clock */}
    <g transform="translate(2030 300)">
      <circle r={54} fill="#fff" stroke={INK} strokeWidth={8} />
      <line x1={0} y1={0} x2={0} y2={-36} stroke={INK} strokeWidth={6} strokeLinecap="round" transform={`rotate(${frame * 0.5})`} />
      <line x1={0} y1={0} x2={26} y2={0} stroke={INK} strokeWidth={7} strokeLinecap="round" />
      <circle r={6} fill={INK} />
    </g>
    {/* calendar */}
    <g transform="translate(2560 430)">
      <rect x={-56} y={-70} width={112} height={140} rx={6} fill="#fff" stroke={INK} strokeWidth={5} />
      <rect x={-56} y={-70} width={112} height={34} rx={6} fill="#D6332A" />
      <text x={0} y={30} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={58} fill={INK}>
        28
      </text>
    </g>
  </g>
);

// ------------------------------------------------------------ roof (p≈0.88)
export const Roof: React.FC<{ frame: number; lightsOn: number }> = ({ frame, lightsOn }) => (
  <g>
    <rect x={-900} y={-760} width={5200} height={200} fill="#8C8F93" />
    {Array.from({ length: 24 }).map((_, i) => (
      <path key={i} d={`M ${-900 + i * 220} -560 L ${-790 + i * 220} -660 L ${-680 + i * 220} -560`} fill="none" stroke="#5E646B" strokeWidth={14} />
    ))}
    <rect x={-900} y={-572} width={5200} height={18} fill="#5E646B" />
    {/* hanging tube lights */}
    {[300, 1000, 1700, 2400].map((x, i) => (
      <g key={x} transform={`translate(${x} ${-560}) rotate(${Math.sin(frame / 40 + i) * 1.2})`}>
        <line x1={-80} y1={0} x2={-80} y2={190} stroke="#333" strokeWidth={3} />
        <line x1={80} y1={0} x2={80} y2={190} stroke="#333" strokeWidth={3} />
        <rect x={-110} y={186} width={220} height={22} rx={10} fill="#7D858C" stroke={INK} strokeWidth={4} />
        <rect x={-100} y={204} width={200} height={14} rx={7} fill={lightsOn > 0.5 ? '#FFFBE0' : '#8C8C80'} />
        {lightsOn > 0.5 && <ellipse cx={0} cy={214} rx={160} ry={26} fill="#FFF6C8" opacity={0.25 * lightsOn} />}
      </g>
    ))}
  </g>
);

// ------------------------------------------------------------ floor (p=1)
export const Floor: React.FC = () => (
  <g>
    <rect x={-900} y={FLOOR - 40} width={5200} height={900} fill="#B9AE98" />
    <rect x={-900} y={FLOOR - 40} width={5200} height={14} fill="#9C917C" />
    <rect x={-900} y={FLOOR + 160} width={5200} height={700} fill="#A99E88" />
    {/* painted walkway */}
    <rect x={-900} y={FLOOR + 110} width={5200} height={12} fill="#F2C230" />
    {[300, 1200, 2100, 2900].map((x) => (
      <ellipse key={x} cx={x} cy={FLOOR + 70} rx={90} ry={14} fill="#8E846F" opacity={0.6} />
    ))}
  </g>
);

// ------------------------------------------------------------ roller door
/** Daylight seen through the doorway — drawn behind whoever stands in it. */
export const DoorOutside: React.FC = () => (
  <g>
    <defs>
      <radialGradient id="doorGlow" cx="0.5" cy="0.6" r="0.7">
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#FFD98A" />
      </radialGradient>
    </defs>
    <rect x={70} y={-60} width={480} height={FLOOR + 60} fill="url(#doorGlow)" />
  </g>
);

export const RollerDoor: React.FC<{ open: number; frame: number; rattle: number }> = ({ open, frame, rattle }) => {
  const top = -60;
  const h = FLOOR - top;
  const rise = open * h;
  const jitter = Math.sin(frame * 2.3) * rattle * 6;
  return (
    <g>
      <defs>
        <clipPath id="doorClip">
          <rect x={70} y={top} width={480} height={h} />
        </clipPath>
      </defs>
      <g clipPath="url(#doorClip)">
        <g transform={`translate(${jitter} ${-rise})`}>
          <rect x={70} y={top} width={480} height={h} fill="#8E9AA3" />
          {Array.from({ length: 26 }).map((_, i) => (
            <rect key={i} x={70} y={top + i * 37} width={480} height={30} fill="#A6B1B9" stroke="#66727B" strokeWidth={3} />
          ))}
          <rect x={250} y={FLOOR - 60} width={120} height={22} rx={6} fill="#56626A" />
        </g>
      </g>
      {/* frame */}
      <rect x={52} y={top - 70} width={516} height={70} fill="#56626A" stroke={INK} strokeWidth={6} />
      <rect x={40} y={top - 4} width={36} height={h + 4} fill="#6B7780" stroke={INK} strokeWidth={6} />
      <rect x={544} y={top - 4} width={36} height={h + 4} fill="#6B7780" stroke={INK} strokeWidth={6} />
      {/* yellow-black hazard strip */}
      {Array.from({ length: 14 }).map((_, i) => (
        <path key={i} d={`M ${52 + i * 37} ${top - 70} l 18 0 l -18 30 l -18 0 Z`} fill="#F2C230" opacity={0.9} />
      ))}
    </g>
  );
};

/** Light spilling in from the open door across the floor. */
export const DoorLight: React.FC<{ amount: number }> = ({ amount }) =>
  amount <= 0.01 ? null : (
    <g opacity={amount} style={{ mixBlendMode: 'screen' }}>
      <path d={`M 90 -40 L 530 -40 L 1500 ${FLOOR + 400} L -300 ${FLOOR + 400} Z`} fill="#FFE9A8" opacity={0.35} />
    </g>
  );

// ------------------------------------------------------------ lathe
export const Lathe: React.FC<{ frame: number; running: number; x: number }> = ({ frame, running, x }) => {
  const spin = frame * 38 * running;
  return (
    <g transform={`translate(${x} ${FLOOR})`}>
      <rect x={-200} y={-90} width={400} height={90} rx={8} fill="#4B6762" stroke={INK} strokeWidth={LINE * 1.2} />
      <rect x={-170} y={-60} width={30} height={60} fill="#3A524E" />
      <rect x={140} y={-60} width={30} height={60} fill="#3A524E" />
      {/* bed */}
      <rect x={-200} y={-150} width={400} height={60} rx={6} fill="#6E8F88" stroke={INK} strokeWidth={LINE * 1.2} />
      <rect x={-190} y={-140} width={380} height={10} fill="#C5D2CE" />
      {/* headstock */}
      <rect x={-200} y={-300} width={150} height={150} rx={10} fill="#5F807A" stroke={INK} strokeWidth={LINE * 1.2} />
      <rect x={-186} y={-284} width={60} height={34} rx={4} fill="#22302D" />
      <circle cx={-170} cy={-200} r={10} fill="#3ECF6A" stroke={INK} strokeWidth={3} />
      <circle cx={-140} cy={-200} r={10} fill="#E0473A" stroke={INK} strokeWidth={3} />
      {/* chuck: spinning jaws */}
      <g transform={`translate(-20 -225)`}>
        <ellipse rx={30} ry={62} fill="#A9B4B8" stroke={INK} strokeWidth={LINE} />
        {[0, 120, 240].map((a) => {
          const ang = ((a + spin) * Math.PI) / 180;
          return <rect key={a} x={-10} y={Math.sin(ang) * 40 - 8} width={20} height={16} fill="#5E676B" stroke={INK} strokeWidth={2.5} opacity={Math.cos(ang) > -0.3 ? 1 : 0.35} />;
        })}
      </g>
      {/* workpiece + tailstock */}
      <rect x={10} y={-236} width={120} height={22} fill="#D5DCDF" stroke={INK} strokeWidth={3} />
      {running > 0.5 &&
        [0, 1, 2].map((i) => (
          <path key={i} d={`M 120 -214 q ${10 + i * 8} ${20 + ((frame * 3 + i * 7) % 18)} ${24 + i * 6} ${30}`} stroke="#E8A13A" strokeWidth={3} fill="none" opacity={0.8} />
        ))}
      <rect x={130} y={-270} width={70} height={120} rx={8} fill="#5F807A" stroke={INK} strokeWidth={LINE * 1.2} />
    </g>
  );
};

// ------------------------------------------------------------ hydraulic press
export const Press: React.FC<{ frame: number; running: number; x: number }> = ({ frame, running, x }) => {
  const cyc = (frame % 36) / 36;
  const ram = running > 0.5 ? (cyc < 0.25 ? cyc / 0.25 : cyc < 0.4 ? 1 : 1 - (cyc - 0.4) / 0.6) : 0;
  const y = -360 + ram * 120;
  return (
    <g transform={`translate(${x} ${FLOOR})`}>
      <rect x={-110} y={-60} width={220} height={60} fill="#B65A28" stroke={INK} strokeWidth={LINE * 1.2} />
      <rect x={-100} y={-520} width={36} height={470} fill="#E07B39" stroke={INK} strokeWidth={LINE * 1.2} />
      <rect x={64} y={-520} width={36} height={470} fill="#E07B39" stroke={INK} strokeWidth={LINE * 1.2} />
      <rect x={-120} y={-560} width={240} height={60} rx={8} fill="#E07B39" stroke={INK} strokeWidth={LINE * 1.2} />
      <rect x={-16} y={-500} width={32} height={y + 500} fill="#C9D1D5" stroke={INK} strokeWidth={4} />
      <rect x={-60} y={y} width={120} height={40} rx={4} fill="#7B868C" stroke={INK} strokeWidth={4} />
      <rect x={-64} y={-100} width={128} height={40} fill="#5E676B" stroke={INK} strokeWidth={4} />
      <g transform="translate(0 -530)">
        <circle cx={-70} r={18} fill="#fff" stroke={INK} strokeWidth={4} />
        <line x1={-70} y1={0} x2={-70 + 12 * Math.cos(ram * 3)} y2={-12 * Math.sin(ram * 3)} stroke="#C0392B" strokeWidth={3} />
      </g>
    </g>
  );
};

// ------------------------------------------------------------ office corner
export const Desk: React.FC<{ x: number; frame: number }> = ({ x, frame }) => (
  <g transform={`translate(${x} ${FLOOR})`}>
    {/* files */}
    <rect x={150} y={-330} width={110} height={70} fill="#E3C27A" stroke={INK} strokeWidth={4} transform="rotate(-3 200 -300)" />
    <rect x={146} y={-372} width={110} height={44} fill="#C45B3C" stroke={INK} strokeWidth={4} transform="rotate(4 200 -350)" />
    <rect x={156} y={-404} width={100} height={34} fill="#3E7CB1" stroke={INK} strokeWidth={4} />
    {/* old monitor */}
    <g transform="translate(-10 -262)">
      <rect x={-20} y={-150} width={170} height={130} rx={12} fill="#D8D3C3" stroke={INK} strokeWidth={5} />
      <rect x={-4} y={-136} width={138} height={98} rx={6} fill="#26424D" />
      <path d="M 10 -60 l 30 -24 l 26 14 l 34 -36" stroke="#E0473A" strokeWidth={6} fill="none" strokeLinejoin="round" />
      <rect x={40} y={-20} width={50} height={20} fill="#BEB8A6" stroke={INK} strokeWidth={4} />
    </g>
    {/* landline */}
    <g transform="translate(-120 -276)">
      <rect x={-34} y={-24} width={68} height={30} rx={8} fill="#B8322A" stroke={INK} strokeWidth={4} />
      <path d="M -40 -26 Q 0 -50 40 -26" stroke={INK} strokeWidth={14} fill="none" strokeLinecap="round" />
    </g>
    {/* chai glass, steaming */}
    <g transform="translate(110 -280)">
      <path d="M -14 -36 L 14 -36 L 10 0 L -10 0 Z" fill="#C98A4B" stroke={INK} strokeWidth={4} opacity={0.95} />
      <path d={`M -4 -44 q ${6 + Math.sin(frame / 8) * 4} -10 0 -22 q -6 -10 2 -20`} stroke="#fff" strokeWidth={4} fill="none" opacity={0.6} strokeLinecap="round" />
    </g>
    {/* table */}
    <rect x={-200} y={-276} width={500} height={34} rx={6} fill="#9A6538" stroke={INK} strokeWidth={LINE * 1.2} />
    <rect x={-180} y={-242} width={460} height={242} fill="#7E4F2B" stroke={INK} strokeWidth={LINE * 1.2} />
    <rect x={-160} y={-222} width={190} height={90} rx={6} fill="#8E5B33" stroke={INK} strokeWidth={4} />
    <rect x={60} y={-222} width={190} height={90} rx={6} fill="#8E5B33" stroke={INK} strokeWidth={4} />
    <circle cx={-65} cy={-177} r={8} fill={GOLD} stroke={INK} strokeWidth={3} />
    <circle cx={155} cy={-177} r={8} fill={GOLD} stroke={INK} strokeWidth={3} />
    {/* nameplate */}
    <g transform="translate(-60 -298)">
      <path d="M -70 22 L -60 -14 L 60 -14 L 70 22 Z" fill="#2B2B2B" stroke={INK} strokeWidth={4} />
      <text x={0} y={14} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={26} fill={GOLD}>
        मालिक
      </text>
    </g>
  </g>
);

export const Crates: React.FC<{ x: number }> = ({ x }) => (
  <g transform={`translate(${x} ${FLOOR})`}>
    {[
      [0, -150, 170, 150],
      [170, -150, 170, 150],
      [60, -290, 170, 140],
    ].map(([cx, cy, w, h], i) => (
      <g key={i}>
        <rect x={cx} y={cy} width={w} height={h} fill="#C9954F" stroke={INK} strokeWidth={LINE * 1.1} />
        <path d={`M ${cx} ${cy} L ${cx + w} ${cy + h} M ${cx + w} ${cy} L ${cx} ${cy + h}`} stroke="#A0733A" strokeWidth={8} />
        <rect x={cx + 6} y={cy + 6} width={w - 12} height={h - 12} fill="none" stroke="#A0733A" strokeWidth={6} />
      </g>
    ))}
  </g>
);

export const Drill: React.FC<{ x: number; frame: number; running: number }> = ({ x, frame, running }) => (
  <g transform={`translate(${x} ${FLOOR})`}>
    <rect x={-70} y={-30} width={140} height={30} fill="#3B5D8F" stroke={INK} strokeWidth={LINE} />
    <rect x={-14} y={-560} width={28} height={530} fill="#8C9AA3" stroke={INK} strokeWidth={LINE} />
    <rect x={-60} y={-300} width={120} height={22} fill="#3B5D8F" stroke={INK} strokeWidth={LINE} />
    <rect x={-80} y={-620} width={190} height={110} rx={14} fill="#3B5D8F" stroke={INK} strokeWidth={LINE} />
    <rect x={70} y={-510} width={14} height={60 + Math.sin(frame / 6) * 6 * running} fill="#C9D1D5" stroke={INK} strokeWidth={3} />
  </g>
);

/** Out-of-focus foreground pillar & chain hoist (p≈1.35) for depth in pans. */
export const ForegroundPillar: React.FC<{ x: number }> = ({ x }) => (
  <g transform={`translate(${x} 0)`}>
    <rect x={-60} y={-900} width={120} height={2600} fill="#3E4A52" />
    <rect x={-60} y={-900} width={30} height={2600} fill="#2C353B" />
    {Array.from({ length: 10 }).map((_, i) => (
      <circle key={i} cx={40} cy={-200 + i * 180} r={12} fill="#55626B" />
    ))}
  </g>
);
