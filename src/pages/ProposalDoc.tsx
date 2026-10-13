import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button, Logo, Notice } from '@/components/ui';
import { getAssessment, getTelemetry, useAppState } from '@/store/store';
import { hashAssumptions } from '@/engine/assumptions';
import { dateLabel, inr, monthLabel, num, roundFriendly } from '@/lib/format';
import { shadeLabel } from '@/engine/roof';

/** Printable preliminary proposal generated from the live calculation engine. */
export default function ProposalDoc() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const s = useAppState();
  const c = s.customers.find((x) => x.id === id);
  if (!c) return <div className="p-8">Customer not found.</div>;
  const a = getAssessment(c, s);
  const r = a.recommendation;
  const ch = r.chosen;
  const last = c.proposals[c.proposals.length - 1];
  const hash = hashAssumptions(a.assumptions, c.tariff, JSON.stringify([c.design, c.roof.polygon, c.roof.obstacles, c.loadProfile.workdayKw]));
  const stale = last && last.assumptionsHash !== hash;
  const statement = sp.get('mode') === 'statement';
  const tel = statement ? getTelemetry(c, s) : null;
  const pending = [
    !c.roof.verified && 'Rooftop structural, condition and shading verification by an engineer',
    c.loadProfile.kind !== 'uploaded_interval' && 'Actual interval (15-minute) meter data — current load profile is estimated/synthetic',
    'Electrical feasibility: DISCOM net-billing / export approval, protection and metering',
    c.business.premises === 'rented' && c.screening.roofPermission !== 'landlord_granted' && 'Landlord permission (NOC) and lease tenure',
    !['suitable_for_ppa', 'consider_financed'].includes(c.eligibility.decision) && 'Commercial eligibility and credit review (subject to consent and authorised institutions)',
    c.tariff.isIllustrative && 'Replace illustrative tariff values with the applicable tariff order and the customer’s actual bills',
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-3xl items-center justify-between gap-2 px-4">
        <Button variant="ghost" onClick={() => nav(-1)} icon={<ArrowLeft className="h-4 w-4" />}>
          Back
        </Button>
        <Button onClick={() => window.print()} icon={<Printer className="h-4 w-4" />}>
          Print / Save as PDF
        </Button>
      </div>
      <article className="print-page mx-auto max-w-3xl space-y-6 bg-white p-8 text-[13px] leading-relaxed text-slate-800 shadow-card">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <Logo />
            <div className="mt-2 text-xs text-slate-500">Concept prototype — not an official Reliance offer</div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div className="text-base font-bold text-navy">{statement ? 'Plan & savings statement' : 'Preliminary Proposal'}</div>
            {last && !statement && (
              <div>
                Version {last.version} · {dateLabel(last.generatedAt)}
              </div>
            )}
            <div>Ref: {c.id}</div>
            <div>Calc ID: {hash}</div>
          </div>
        </header>
        {stale && !statement && <Notice tone="warn">Assumptions have changed since version {last?.version} was generated. Values below reflect the latest calculation; regenerate the proposal to issue a new version.</Notice>}
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy">Customer</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div>Business: <strong>{c.business.name}</strong> (fictional)</div>
            <div>Location: {c.business.city} {c.business.pinCode}</div>
            <div>Contact: {c.business.contactName}</div>
            <div>Premises: {c.business.premises}</div>
            <div>Stated monthly bill: {inr(c.bill.monthlyBillInr)}</div>
            <div>Modelled monthly bill: {inr(r.baselineMonthlyBillInr)}</div>
          </div>
        </section>
        {statement && tel ? (
          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy">Recent months (simulated monitoring)</h2>
            <table className="w-full text-left">
              <thead className="border-b text-xs text-slate-500">
                <tr>
                  <th className="py-1">Month</th>
                  <th>Solar units</th>
                  <th>Bill avoided</th>
                  <th>{c.installation.planType === 'ppa' ? 'JioUrja payment' : 'EMI + maintenance'}</th>
                  <th>Net savings</th>
                </tr>
              </thead>
              <tbody>
                {tel.months.map((m) => (
                  <tr key={m.month} className="border-b border-slate-100">
                    <td className="py-1">{monthLabel(m.month)}</td>
                    <td>{num(m.solarKwh)}</td>
                    <td>{inr(m.avoidedCostInr)}</td>
                    <td>{inr(m.paymentInr)}</td>
                    <td className="font-semibold">{inr(m.netSavingsInr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-500">Simulated data generated by the JioUrja calculation engine; no live meter or inverter data is connected in this prototype.</p>
          </section>
        ) : ch ? (
          <>
            <section>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy">Recommended system</h2>
              <p>
                <strong>
                  {num(ch.solarKw, 1)} kW rooftop solar{ch.batteryKwh > 0 ? ` + ${ch.batteryKwh} kWh / ${num(ch.batteryKw, 1)} kW battery storage` : ' (no battery)'}
                </strong>{' '}
                — {r.type === 'solar_battery' ? 'storage improves net benefit under current assumptions' : r.type === 'needs_survey' ? 'roof to be measured on site' : 'battery storage not currently recommended'}.
              </p>
              <ul className="mt-2 list-disc pl-5">
                {r.customerMessages.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Box k="Estimated annual solar generation" v={`${num(ch.sim.annual.solarKwh)} units`} />
                <Box k="Units used on site (incl. battery)" v={`${num(ch.sim.annual.selfConsumedKwh + ch.sim.annual.batteryDeliveredKwh)} units/yr`} />
                <Box k="Roof / shade" v={c.roof.polygon.length >= 3 ? `${num(a.roof.grossAreaM2)} m² gross · ${shadeLabel(a.roof)}` : 'Not measured'} />
              </div>
            </section>
            <section>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy">Payment pathways (year-1 estimates)</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="font-bold text-navy">A. Energy-as-a-Service (PPA){c.preferredPlan === 'ppa' ? ' — selected' : ''}</div>
                  <Line k="Installation cost" v="₹0" />
                  <Line k="Refundable security deposit (est.)" v={inr(roundFriendly(ch.customerPpa.upfrontDepositInr))} />
                  <Line k="Tariff per solar unit (illustrative)" v={`₹${ch.ppaRateInrPerKwh.toFixed(2)}`} />
                  <Line k="Term" v={`${a.assumptions.ppaTermYears} years`} />
                  <Line k="Monthly payment (est.)" v={inr(ch.customerPpa.monthlyPaymentInr)} />
                  <Line k="Monthly bill avoided (est.)" v={inr(ch.customerPpa.year1AvoidedInr / 12)} />
                  <Line k="Net monthly savings (est.)" v={inr(ch.customerPpa.monthlyNetSavingsInr)} bold />
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="font-bold text-navy">B. Financed ownership{c.preferredPlan === 'loan' ? ' — selected' : ''}</div>
                  <Line k="Installation cost (est.)" v={inr(ch.capexInr)} />
                  <Line k={`Down payment (${a.assumptions.downPaymentPct}%)`} v={inr(ch.customerLoan.downPaymentInr)} />
                  <Line k={`Loan @ ${a.assumptions.loanInterestPct}% for ${a.assumptions.loanTenureMonths / 12} yrs`} v={inr(ch.customerLoan.loanAmountInr)} />
                  <Line k="Monthly EMI" v={inr(ch.customerLoan.emiInr)} />
                  <Line k="Maintenance (est.)" v={`${inr(ch.customerLoan.year1OmInr / 12)}/mo`} />
                  <Line k="Net monthly savings during loan" v={inr(ch.customerLoan.monthlyNetDuringLoanInr)} bold />
                  <Line k="Net monthly savings after loan" v={inr(ch.customerLoan.monthlyNetAfterLoanInr)} />
                </div>
              </div>
            </section>
            <section>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy">Key illustrative assumptions</h2>
              <div className="grid grid-cols-2 gap-x-6 text-xs">
                <Line k="Tariff" v={c.tariff.name} />
                <Line k="Energy + wheeling + FAC (₹/unit)" v={`${c.tariff.energyChargeInrPerKwh} + ${c.tariff.wheelingChargeInrPerKwh} + ${c.tariff.fuelAdjustmentInrPerKwh}`} />
                <Line k="Electricity duty" v={`${c.tariff.electricityDutyPct}%`} />
                <Line k="Fixed/demand charge (unchanged by solar)" v={`₹${c.tariff.fixedDemandChargeInrPerKvaMonth}/kVA/month`} />
                <Line k="Export compensation" v={`₹${c.tariff.exportCompensationInrPerKwh}/unit${c.tariff.exportLimitKw != null ? ` (limit ${c.tariff.exportLimitKw} kW)` : ''}`} />
                <Line k="Tariff escalation" v={`${c.tariff.annualEscalationPct}%/yr`} />
                <Line k="Solar CAPEX" v={`₹${num(a.assumptions.solarCapexInrPerKw)}/kW`} />
                <Line k="Battery CAPEX" v={`₹${num(a.assumptions.batteryCapexInrPerKwh)}/kWh`} />
                <Line k="Performance ratio / degradation" v={`${a.assumptions.performanceRatio} / ${a.assumptions.solarDegradationPctYr}%/yr`} />
                <Line k="PPA pricing" v={a.assumptions.ppaRateMode === 'cost_reflective' ? `Cost-reflective at ${a.assumptions.providerHurdleRatePct}% target return` : 'Manual rate'} />
                <Line k="Load profile" v={c.loadProfile.label} />
                <Line k="Effective bill rate vs avoidable solar rate" v={`₹${r.effectiveRateInrPerKwh.toFixed(2)} vs ₹${r.avoidableSolarRateInrPerKwh.toFixed(2)} per unit`} />
              </div>
            </section>
          </>
        ) : (
          <Notice tone="warn">A system could not yet be sized. An engineering survey is required.</Notice>
        )}
        {!statement && (
          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy">Pending verification items</h2>
            <ul className="list-disc pl-5">
              {pending.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        )}
        <footer className="border-t border-slate-200 pt-3 text-[11px] text-slate-500">
          This preliminary proposal is illustrative and not an offer, quotation or credit approval. Final pricing and system design are subject to an engineering survey, commercial approval, applicable regulations and
          DISCOM requirements. Financing is subject to the lender's own assessment and the customer's consent. Solar generation does not provide backup during grid outages unless a suitable hybrid architecture is
          installed. JioUrja 2.0 is a concept by Team Miles Ahead, FMS Delhi; it is not an authorised Reliance product.
        </footer>
      </article>
    </div>
  );
}

function Box({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5">
      <div className="text-[11px] text-slate-500">{k}</div>
      <div className="font-semibold text-navy">{v}</div>
    </div>
  );
}

function Line({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
      <span className="text-slate-500">{k}</span>
      <span className={bold ? 'font-bold text-teal-700' : 'font-medium'}>{v}</span>
    </div>
  );
}
