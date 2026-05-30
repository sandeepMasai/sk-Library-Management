import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';

export function NotFound() {
  return (
    <section className="gradient-mesh flex min-h-[60vh] items-center justify-center px-4 py-24 sm:px-6">
      <GlassCard dark padding="lg" className="max-w-lg text-center">
        <p className="font-display text-7xl font-bold text-gradient-brand">404</p>
        <p className="mt-4 text-lg text-white/80">This page could not be found.</p>
        <Link to="/" className="mt-8 inline-block">
          <Button>Back to home</Button>
        </Link>
      </GlassCard>
    </section>
  );
}
