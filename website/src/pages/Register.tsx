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

export function Register() {
  const navigate = useNavigate();
  const { setSession } = useAuth();

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!registrationToken) {
      setError('Verify your email with the OTP before registering.');
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
      title="Register your library"
      subtitle="Create an owner account with email verification. Students are added by your library after signup."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Library name *" required value={libraryName} onChange={(e) => setLibraryName(e.target.value)} />
        <Input label="Owner name *" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />

        <Input
          label="Email *"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailVerified(false);
            setRegistrationToken(null);
          }}
        />

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-800">Email verification</p>
          {emailVerified ? (
            <p className="mt-2 text-sm text-emerald-700">✓ Email verified</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={otpSending || resendSec > 0} onClick={handleSendOtp}>
                  {otpSending ? 'Sending…' : resendSec > 0 ? `Resend in ${resendSec}s` : 'Send code'}
                </Button>
              </div>
              <Input
                label="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
              <Button type="button" variant="secondary" disabled={otpVerifying || otp.length !== 6} onClick={handleVerifyOtp}>
                {otpVerifying ? 'Verifying…' : 'Verify email'}
              </Button>
            </div>
          )}
        </div>

        <Input
          label="Password *"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Minimum 8 characters"
        />
        <Input
          label="Mobile (optional)"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
        />

        <Select
          label="State *"
          required
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setCity('');
          }}
          options={stateOptions}
        />
        <Select label="City *" required value={city} onChange={(e) => setCity(e.target.value)} options={cityOptions} />
        <Input label="Area / locality *" required value={place} onChange={(e) => setPlace(e.target.value)} />
        <Input
          label="PIN code *"
          required
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
        />
        <Input
          label="Total seats"
          type="number"
          min={1}
          max={5000}
          value={totalSeats}
          onChange={(e) => setTotalSeats(e.target.value)}
          hint="We will create numbered seats after registration"
        />

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <Button type="submit" fullWidth disabled={loading || !emailVerified}>
          {loading ? 'Creating library…' : 'Create library account'}
        </Button>
      </form>
    </AuthShell>
  );
}
