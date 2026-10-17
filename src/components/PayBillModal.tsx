import { useState } from 'react';
import { Banknote, CheckCircle2, CreditCard, Landmark, Smartphone } from 'lucide-react';
import { Button, ChoiceCard, Field, Input, Modal, Notice } from '@/components/ui';
import { store } from '@/store/store';
import { recordPayment } from '@/store/actions';
import { inr } from '@/lib/format';
import type { PaymentMethod, PaymentRecord } from '@/types';

/**
 * Lets the customer pay their JioUrja bill (PPA charge or loan EMI + maintenance).
 * This is a DEMO payment confirmation only: no payment gateway, bank account
 * or real money is involved. It is clearly labelled as such on every screen.
 */
export function PayBillModal({
  open,
  onClose,
  customerId,
  amountInr,
  dueLabel,
  forMonth,
  clearedOverdue,
  onPaid,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string;
  amountInr: number;
  dueLabel: string;
  forMonth?: string;
  clearedOverdue: boolean;
  onPaid: (record: PaymentRecord) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [upiId, setUpiId] = useState('');
  const [step, setStep] = useState<'form' | 'paying' | 'success'>('form');
  const [record, setRecord] = useState<PaymentRecord | null>(null);

  const reset = () => {
    setStep('form');
    setRecord(null);
    setUpiId('');
  };
  const close = () => {
    onClose();
    // Reset after the close animation would run, if there were one.
    setTimeout(reset, 200);
  };

  const pay = async () => {
    setStep('paying');
    await new Promise((r) => setTimeout(r, 700)); // simulate processing
    const r = recordPayment(store.get(), customerId, { amountInr, method, forMonth, clearedOverdue }, 'Customer portal');
    store.set(r.state);
    setRecord(r.record);
    setStep('success');
    onPaid(r.record);
  };

  return (
    <Modal open={open} onClose={close} title={step === 'success' ? 'Payment confirmed' : `Pay ${dueLabel}`}>
      {step === 'success' && record ? (
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-teal" />
          <div>
            <div className="text-2xl font-bold text-teal-700">{inr(record.amountInr)} paid</div>
            <div className="text-sm text-slate-500">Reference {record.reference}</div>
          </div>
          <Notice tone="sim">This is a demo payment confirmation. No real money moved and no payment gateway was contacted.</Notice>
          <Button block onClick={close}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-surface p-4 text-center">
            <div className="text-xs font-medium text-slate-500">Amount due</div>
            <div className="text-3xl font-bold text-navy">{inr(amountInr)}</div>
          </div>
          <Field label="Pay using">
            <div className="grid gap-2 sm:grid-cols-3">
              <ChoiceCard selected={method === 'upi'} onClick={() => setMethod('upi')} title="UPI" icon={<Smartphone className="h-5 w-5" />} />
              <ChoiceCard selected={method === 'card'} onClick={() => setMethod('card')} title="Card" icon={<CreditCard className="h-5 w-5" />} />
              <ChoiceCard selected={method === 'netbanking'} onClick={() => setMethod('netbanking')} title="Net banking" icon={<Landmark className="h-5 w-5" />} />
            </div>
          </Field>
          {method === 'upi' && (
            <Field label="UPI ID" optional hint="Not actually verified in this demo.">
              <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi" />
            </Field>
          )}
          <Notice tone="sim">
            <span className="flex items-start gap-1.5">
              <Banknote className="mt-0.5 h-4 w-4 shrink-0" />
              Demo payment only — this prototype has no payment gateway or bank connection. Clicking "Pay" simply records a sample receipt.
            </span>
          </Notice>
          <Button block size="lg" variant="teal" loading={step === 'paying'} onClick={pay}>
            {step === 'paying' ? 'Processing…' : `Pay ${inr(amountInr)}`}
          </Button>
        </div>
      )}
    </Modal>
  );
}
