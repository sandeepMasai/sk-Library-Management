import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  completeForgotPasswordReset,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
} from '../lib/auth';

const STEPS = [
  { id: 1, label: 'Email', hint: 'Your account' },
  { id: 2, label: 'Verify', hint: '6-digit code' },
  { id: 3, label: 'Reset', hint: 'New password' },
] as const;

function ForgotPasswordSteps({ step }: { step: number }) {
  return (
    <div className="register-steps" aria-label="Password reset progress">
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

export function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetSessionToken, setResetSessionToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendSec, setResendSec] = useState(0);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setInterval(() => setResendSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendSec]);

  async function handleSendOtp() {
    setError('');
    setSuccess('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setOtpSending(true);
    try {
      const res = await sendForgotPasswordOtp(email);
      setResendSec(res.resendAfterSeconds ?? 60);
      setOtp('');
      setResetSessionToken(null);
      setSuccess(
        res.message ||
          'If an account exists for this email, we sent a 6-digit code. Check your inbox and spam folder.'
      );
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send code');
    } finally {
      setOtpSending(false);
    }
  }

  async function handleVerifyOtp() {
    setError('');
    setSuccess('');
    if (otp.replace(/\D/g, '').length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setOtpVerifying(true);
    try {
      const res = await verifyForgotPasswordOtp(email, otp);
      setResetSessionToken(res.resetSessionToken);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setOtpVerifying(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetSessionToken) {
      setError('Verify your email with the code before resetting your password.');
      setStep(2);
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await completeForgotPasswordReset(email, resetSessionToken, newPassword);
      navigate('/login', {
        replace: true,
        state: {
          message: res.message || 'Password updated. Sign in with your new password.',
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      mode="login"
      wide
      title="Forgot password"
      subtitle="Reset your library account password using a one-time email code."
      footer={
        <>
          Remember your password?{' '}
          <Link to="/login" className="font-semibold text-teal-400 hover:text-teal-300">
            Back to sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordSteps step={step} />

      <form onSubmit={onSubmit} className="register-form space-y-4">
        {step === 1 ? (
          <section className="register-section">
            <div className="register-section-head">
              <span className="register-section-icon" aria-hidden>
                ✉️
              </span>
              <div>
                <h2 className="register-section-title">Library email</h2>
                <p className="register-section-desc">
                  Enter the email you used when registering your library. We&apos;ll send a 6-digit code.
                </p>
              </div>
            </div>

            <Input
              dark
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@library.com"
            />

            <Button type="button" fullWidth disabled={otpSending} onClick={handleSendOtp}>
              {otpSending ? 'Sending code…' : 'Send reset code'}
            </Button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="register-section">
            <div className="register-section-head">
              <span className="register-section-icon" aria-hidden>
                🔢
              </span>
              <div>
                <h2 className="register-section-title">Verify code</h2>
                <p className="register-section-desc">
                  Enter the 6-digit code sent to <span className="text-white">{email.trim().toLowerCase()}</span>.
                </p>
              </div>
            </div>

            <Input
              dark
              label="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              placeholder="••••••"
              autoComplete="one-time-code"
            />

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={otpVerifying || otp.replace(/\D/g, '').length !== 6}
                onClick={handleVerifyOtp}
              >
                {otpVerifying ? 'Verifying…' : 'Verify code'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="!border-white/20 !text-white hover:!bg-white/10"
                disabled={otpSending || resendSec > 0}
                onClick={handleSendOtp}
              >
                {otpSending ? 'Sending…' : resendSec > 0 ? `Resend in ${resendSec}s` : 'Resend code'}
              </Button>
            </div>

            <button
              type="button"
              className="text-sm text-slate-400 hover:text-white"
              onClick={() => {
                setError('');
                setSuccess('');
                setStep(1);
              }}
            >
              Change email
            </button>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="register-section">
            <div className="register-section-head">
              <span className="register-section-icon" aria-hidden>
                🔐
              </span>
              <div>
                <h2 className="register-section-title">New password</h2>
                <p className="register-section-desc">Choose a new password for your library account.</p>
              </div>
            </div>

            <Input
              dark
              label="New password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint="Minimum 8 characters"
              placeholder="Create a new password"
            />
            <Input
              dark
              label="Confirm password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
            />

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Updating password…' : 'Update password'}
            </Button>
          </section>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-200">
            {success}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        ) : null}
      </form>
    </AuthShell>
  );
}
