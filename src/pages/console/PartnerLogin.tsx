import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button, Card, Field, Input, Logo, Notice, Select } from '@/components/ui';
import { STAFF_USERS } from '@/data/seed';
import { store } from '@/store/store';

export default function PartnerLogin() {
  const nav = useNavigate();
  const [user, setUser] = useState(STAFF_USERS[0].id);
  const [pin, setPin] = useState('2026');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== '2026') return setErr('Incorrect demo PIN. Use 2026.');
    setBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    store.set((s) => ({ ...s, staffUserId: user }));
    nav('/console');
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-center">
          <Logo light />
        </div>
        <Card>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Lock className="h-5 w-5 text-electric" /> Partner console sign-in
          </h1>
          <p className="mt-1 text-sm text-slate-500">For JioUrja sales, technical and operations staff.</p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="Demo account">
              <Select value={user} onChange={(e) => setUser(e.target.value)}>
                {STAFF_USERS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Demo PIN" error={err} hint="Demo PIN is 2026 (pre-filled).">
              <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} />
            </Field>
            <Button type="submit" block size="lg" loading={busy}>
              Sign in
            </Button>
          </form>
          <Notice tone="info" className="mt-4">
            Demo sign-in only — there is no real authentication in this prototype. All accounts and customers are fictional.
          </Notice>
        </Card>
        <Link to="/" className="flex items-center justify-center gap-1 text-sm font-semibold text-slate-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to customer site
        </Link>
      </div>
    </div>
  );
}
