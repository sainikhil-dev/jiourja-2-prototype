import { LinkButton, Logo } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
      <Logo />
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-slate-500">The page you were looking for does not exist in this prototype.</p>
      <div className="flex gap-2">
        <LinkButton to="/">Customer home</LinkButton>
        <LinkButton to="/console" variant="outline">
          Partner console
        </LinkButton>
      </div>
    </div>
  );
}
