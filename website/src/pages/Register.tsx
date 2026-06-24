import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import { ALL_STATES, INDIA_STATE_CITIES } from '../data/indiaLocations';
import {
  bulkCreateSeats,
  registerLibrary,
  sendRegisterOtp,
  verifyRegisterOtp,
} from '../lib/auth';

const STEPS = [
  { id: 1, label: 'Library', hint: 'Name & email' },
  { id: 2, label: 'Account', hint: 'Password' },
  { id: 3, label: 'Location', hint: 'Address' },
  { id: 4, label: 'Setup', hint: 'Seats' },
] as const;

function RegisterSteps({ step }: { step: number }) {
  return (
    <div className="register-steps" aria-label="Registration progress">
      {STEPS.map((item, index) => {
        const done = step > item.id;
        const active = step === item.id;
        return (
          <div key={item.id} className="register-step">
            <div className="register-step-track">
              <span
                className={`register-step-dot ${done ? 'register-step-dot--done' : ''} ${active ? 'register-step-dot--active' : ''}`}
              >
                {done ? '✓' : item.id}
              </span>
              {index < STEPS.length - 1 ? (
                <span className={`register-step-line ${done ? 'register-step-line--done' : ''}`} />
              ) : null}
            </div>
            <div className="register-step-copy">
              <p className={`register-step-label ${active ? 'register-step-label--active' : ''}`}>{item.label}</p>
              <p className="register-step-hint">{item.hint}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Register() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [step, setStep] = useState(1);

  const [libraryName, setLibraryName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [place, setPlace] = useState('');
  const [pincode, setPincode] = useState('');
  const [totalSeats, setTotalSeats] = useState('50');

  const [otp, setOtp] = useState('');
  const [registrationToken, setRegistrationToken] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [resendSec, setResendSec] = useState(0);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setInterval(() => setResendSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendSec]);

  const cityOptions = useMemo(() => {
    const cities = state ? INDIA_STATE_CITIES[state] || [] : [];
    return [{ value: '', label: 'Select city' }, ...cities.map((c) => ({ value: c, label: c }))];
  }, [state]);

  const stateOptions = useMemo(
    () => [{ value: '', label: 'Select state' }, ...ALL_STATES.map((s) => ({ value: s, label: s }))],
    []
  );

  async function handleSendOtp() {
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email before requesting a code.');
      return;
    }
    setOtpSending(true);
    try {
      const res = await sendRegisterOtp(email);
      setResendSec(res.resendAfterSeconds ?? 60);
      setRegistrationToken(null);
      setEmailVerified(false);
      setOtp('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send code');
    } finally {
      setOtpSending(false);
    }
  }

  async function handleVerifyOtp() {
    setError('');
    setOtpVerifying(true);
    try {
      const res = await verifyRegisterOtp(email, otp);
      setRegistrationToken(res.registrationToken);
      setEmailVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setOtpVerifying(false);
    }
  }

  function validateStep(current: number) {
    if (current === 1) {
      if (!libraryName.trim() || !ownerName.trim()) {
        setError('Enter library name and owner name.');
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError('Enter a valid email address.');
        return false;
      }
      if (!emailVerified) {
        setError('Verify your email with the OTP before continuing.');
        return false;
      }
    }
    if (current === 2) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return false;
      }
    }
    if (current === 3) {
      if (!state || !city || !place.trim()) {
        setError('Complete state, city, and area/locality.');
        return false;
      }
      if (pincode.replace(/\D/g, '').length !== 6) {
        setError('Enter a valid 6-digit PIN code.');
        return false;
      }
    }
    return true;
  }

  function goNext() {
    setError('');
    if (!validateStep(step)) return;
    setStep((s) => Math.min(4, s + 1));
  }

  function goBack() {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!registrationToken) {
      setError('Verify your email with the OTP before registering.');
      setStep(1);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setStep(2);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const phoneDigits = phone.replace(/\D/g, '').slice(-10);
      const session = await registerLibrary({
        libraryName: libraryName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim().toLowerCase(),
        password,
        city,
        state,
        place: place.trim(),
        pincode: pincode.replace(/\D/g, '').slice(0, 6),
        emailVerificationToken: registrationToken,
        ...(phoneDigits.length === 10 ? { phone: phoneDigits } : {}),
      });

      const seats = Number(totalSeats);
      if (Number.isInteger(seats) && seats >= 1 && seats <= 5000) {
        try {
          await bulkCreateSeats(seats);
        } catch {
          /* seats can be configured later in app */
        }
      }

      setSession(session);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      mode="register"
      wide
      title="Register your library"
      subtitle="Set up your SmartLibDesk workspace in a few quick steps."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-teal-400 hover:text-teal-300">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterSteps step={step} />

      <form onSubmit={onSubmit} className="register-form">
        {step === 1 ? (
          <section className="register-section">
            <div className="register-section-head">
              <span className="register-section-icon" aria-hidden>
                🏛️
              </span>
              <div>
                <h2 className="register-section-title">Library details</h2>
                <p className="register-section-desc">Tell us about your study library and verify your email.</p>
              </div>
            </div>

            <div className="register-grid">
              <Input
                dark
                label="Library name *"
                required
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
                placeholder="ABC Study Library"
              />
              <Input
                dark
                label="Owner name *"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <Input
              dark
              label="Email *"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailVerified(false);
                setRegistrationToken(null);
              }}
              placeholder="owner@library.com"
            />

            <div className="register-otp-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Email verification</p>
                  <p className="mt-1 text-xs text-slate-400">We&apos;ll send a 6-digit code to confirm ownership.</p>
                </div>
                {emailVerified ? (
                  <span className="register-verified-badge">✓ Verified</span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="!border-white/20 !text-white hover:!bg-white/10"
                    disabled={otpSending || resendSec > 0}
                    onClick={handleSendOtp}
                  >
                    {otpSending ? 'Sending…' : resendSec > 0 ? `Resend in ${resendSec}s` : 'Send code'}
                  </Button>
                )}
              </div>

              {!emailVerified ? (
                <div className="mt-4 space-y-3">
                  <Input
                    dark
                    label="6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    placeholder="••••••"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    disabled={otpVerifying || otp.length !== 6}
                    onClick={handleVerifyOtp}
                  >
                    {otpVerifying ? 'Verifying…' : 'Verify email'}
                  </Button>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="register-section">
            <div className="register-section-head">
              <span className="register-section-icon" aria-hidden>
                🔐
              </span>
              <div>
                <h2 className="register-section-title">Account security</h2>
                <p className="register-section-desc">Create your login password and optional contact number.</p>
              </div>
            </div>

            <Input
              dark
              label="Password *"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="Minimum 6 characters"
              placeholder="Create a password"
            />
            <Input
              dark
              label="Mobile (optional)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit Indian mobile"
              hint="For support and account recovery"
            />
          </section>
        ) : null}

        {step === 3 ? (
          <section className="register-section">
            <div className="register-section-head">
              <span className="register-section-icon" aria-hidden>
                📍
              </span>
              <div>
                <h2 className="register-section-title">Library location</h2>
                <p className="register-section-desc">Where is your library located? Used on invoices and profile.</p>
              </div>
            </div>

            <div className="register-grid">
              <Select
                dark
                label="State *"
                required
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setCity('');
                }}
                options={stateOptions}
              />
              <Select
                dark
                label="City *"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                options={cityOptions}
              />
            </div>
            <div className="register-grid">
              <Input
                dark
                label="Area / locality *"
                required
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Sector, landmark, street"
              />
              <Input
                dark
                label="PIN code *"
                required
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                placeholder="6-digit PIN"
              />
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="register-section">
            <div className="register-section-head">
              <span className="register-section-icon" aria-hidden>
                💺
              </span>
              <div>
                <h2 className="register-section-title">Seat setup</h2>
                <p className="register-section-desc">We&apos;ll create numbered seats automatically after registration.</p>
              </div>
            </div>

            <Input
              dark
              label="Total seats"
              type="number"
              min={1}
              max={5000}
              value={totalSeats}
              onChange={(e) => setTotalSeats(e.target.value)}
              hint="You can add more seats later from admin settings"
            />

            <div className="register-summary">
              <p className="register-summary-title">Registration summary</p>
              <dl className="register-summary-list">
                <div>
                  <dt>Library</dt>
                  <dd>{libraryName || '—'}</dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>{ownerName || '—'}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{email || '—'}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{[place, city, state].filter(Boolean).join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt>Seats</dt>
                  <dd>{totalSeats || '—'}</dd>
                </div>
              </dl>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        ) : null}

        <div className="register-actions">
          {step > 1 ? (
            <Button type="button" variant="ghost-dark" onClick={goBack}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < 4 ? (
            <Button type="button" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button type="submit" disabled={loading || !emailVerified}>
              {loading ? 'Creating library…' : 'Create library account'}
            </Button>
          )}
        </div>
      </form>
    </AuthShell>
  );
}
