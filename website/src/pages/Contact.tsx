import { useState, type FormEvent } from 'react';
import { PageHero } from '../components/PageHero';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { Input } from '../components/ui/Input';
import { PageContainer } from '../components/ui/PageContainer';
import { SITE } from '../content/site';
import { submitContactForm } from '../lib/api';

export function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      await submitContactForm({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        message: message.trim(),
      });
      setStatus('success');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  return (
    <>
      <PageHero
        title="Let's talk about your library"
        subtitle="We typically respond within 1–2 business days."
        badge="📬 Contact"
      />
      <section className="gradient-mesh border-b border-white/10 py-12 sm:py-16">
        <PageContainer>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
            <GlassCard dark padding="lg">
              <h2 className="font-display text-xl font-bold text-white">Get in touch</h2>
              <p className="mt-2 text-sm text-white/70">Support, sales, and onboarding questions welcome.</p>
              <dl className="mt-8 space-y-6">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-white/50">Email</dt>
                  <dd className="mt-1">
                    <a href={`mailto:${SITE.supportEmail}`} className="font-medium text-teal-300 hover:text-teal-200 hover:underline">
                      {SITE.supportEmail}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-white/50">Automated mail</dt>
                  <dd className="mt-1 text-sm text-white/70">{SITE.noreplyEmail}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-white/50">Location</dt>
                  <dd className="mt-1 text-sm text-white/70">{SITE.address}</dd>
                </div>
              </dl>
            </GlassCard>

            <GlassCard dark padding="lg">
              {status === 'success' ? (
                <div className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  Thank you! Your message has been sent. We will get back to you soon.
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input id="contact-name" label="Name *" required dark value={name} onChange={(e) => setName(e.target.value)} />
                <Input
                  id="contact-email"
                  label="Email *"
                  type="email"
                  required
                  dark
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input id="contact-phone" label="Phone" type="tel" dark value={phone} onChange={(e) => setPhone(e.target.value)} />
                <div className="space-y-1.5">
                  <label htmlFor="contact-message" className="block text-sm font-medium text-slate-200">
                    Message *
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="focus-ring-brand w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white shadow-sm transition placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {status === 'error' ? <p className="text-sm text-rose-300">{errorMsg}</p> : null}
                <Button type="submit" fullWidth disabled={status === 'loading'}>
                  {status === 'loading' ? 'Sending…' : 'Send message'}
                </Button>
              </form>
            </GlassCard>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
