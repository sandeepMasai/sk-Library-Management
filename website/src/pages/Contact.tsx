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
      <section className="bg-white py-12 sm:py-16">
        <PageContainer>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">Get in touch</h2>
              <p className="mt-2 text-sm text-muted">Support, sales, and onboarding questions welcome.</p>
              <dl className="mt-8 space-y-6">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted">Email</dt>
                  <dd className="mt-1">
                    <a href={`mailto:${SITE.supportEmail}`} className="font-medium text-primary hover:underline">
                      {SITE.supportEmail}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted">Automated mail</dt>
                  <dd className="mt-1 text-sm text-slate-600">{SITE.noreplyEmail}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted">Location</dt>
                  <dd className="mt-1 text-sm text-slate-600">{SITE.address}</dd>
                </div>
              </dl>
            </div>

            <GlassCard padding="lg">
              {status === 'success' ? (
                <div className="mb-6 rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-4 text-sm text-emerald-800">
                  Thank you! Your message has been sent. We will get back to you soon.
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input id="contact-name" label="Name *" required value={name} onChange={(e) => setName(e.target.value)} />
                <Input
                  id="contact-email"
                  label="Email *"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input id="contact-phone" label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <div className="space-y-1.5">
                  <label htmlFor="contact-message" className="block text-sm font-medium text-slate-700">
                    Message *
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="focus-ring-brand w-full rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {status === 'error' ? <p className="text-sm text-red-600">{errorMsg}</p> : null}
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
