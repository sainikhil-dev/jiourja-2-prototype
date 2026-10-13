import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Server } from 'lucide-react';
import { Card, LinkButton, Notice } from '@/components/ui';

const CONTENT = {
  'large-industry': {
    icon: <Building2 className="h-7 w-7" />,
    title: 'Large Industry (concept)',
    intro:
      'Large plants usually buy power on HT tariffs with contract demand charges, may combine rooftop, ground-mounted and open-access renewable supply, and need careful protection and grid-code compliance. This segment is part of the broader JioUrja vision; the working prototype focuses on MSMEs.',
    needs: [
      'HT tariff analysis: contract demand, ToD slabs, power factor incentives/penalties and cross-subsidy surcharges.',
      'Captive / group-captive and green energy open-access options alongside rooftop solar.',
      'BESS for demand-charge management, ToD arbitrage and power-quality support — sized from 15-minute meter data.',
      'Protection studies, transformer and evacuation capacity, and DISCOM / SLDC approvals.',
      'Multi-site portfolio monitoring, SCADA integration and performance guarantees.',
      'Structured contracts: long-term PPAs with payment security (LC / escrow) and corporate credit review.',
    ],
    note: 'No economics are shown for this segment: they depend on site-specific HT tariffs, contract demand and open-access rules that the prototype does not model.',
  },
  'data-centre': {
    icon: <Server className="h-7 w-7" />,
    title: 'Data Centres (concept)',
    intro:
      'Data centres run 24×7 with very high reliability requirements. Rooftop solar can only meet a small share of their load, so the relevant offering is a combination of firm renewable supply, storage and resilience services. This is a conceptual page; the prototype does not model data-centre economics.',
    needs: [
      'Round-the-clock (RTC) renewable supply through open access, with hourly matching reporting.',
      'Integration with UPS / BESS architecture and Tier-level redundancy (N+1, 2N) — storage cannot compromise uptime.',
      'Diesel generator displacement strategy and fuel-cost risk.',
      'PUE-aware load analysis and cooling load profiles.',
      'Carbon accounting (Scope 2) and renewable-energy certificates.',
      'Rigorous protection, harmonics and power-quality studies before any connection.',
    ],
    note: 'Any data-centre proposal would require detailed engineering and a bespoke commercial structure.',
  },
} as const;

export default function SegmentInfo() {
  const { segment } = useParams();
  const c = CONTENT[segment as keyof typeof CONTENT];
  if (!c)
    return (
      <Card title="Segment not found">
        <Link to="/" className="text-electric">
          Back to home
        </Link>
      </Card>
    );
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-electric">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-electric-50 p-2.5 text-electric">{c.icon}</div>
        <h1 className="text-2xl font-bold">{c.title}</h1>
      </div>
      <p className="text-slate-600">{c.intro}</p>
      <Card title="What JioUrja would need to assess">
        <ul className="space-y-2 text-sm text-slate-700">
          {c.needs.map((n) => (
            <li key={n} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
              {n}
            </li>
          ))}
        </ul>
      </Card>
      <Notice tone="info">{c.note}</Notice>
      <div className="flex flex-wrap gap-3">
        <LinkButton to="/start">Running an MSME? Check your savings</LinkButton>
        <LinkButton to="/" variant="outline">
          Home
        </LinkButton>
      </div>
    </div>
  );
}
