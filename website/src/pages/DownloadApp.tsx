import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/PageHero';
import { QrImage } from '../components/QrImage';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { PageContainer } from '../components/ui/PageContainer';
import { SITE } from '../content/site';
import { APK_VERSION, getApkUrl, getDownloadPageUrl } from '../lib/appDownload';

const APK_SIZE = '~54 MB';

export function DownloadApp() {
  const apkUrl = getApkUrl();
  const downloadPageUrl = getDownloadPageUrl();
  const [apkReady, setApkReady] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(apkUrl, { method: 'HEAD' })
      .then((res) => {
        if (!cancelled) setApkReady(res.ok);
      })
      .catch(() => {
        if (!cancelled) setApkReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apkUrl]);

  function startDownload() {
    window.location.assign(apkUrl);
  }

  return (
    <>
      <PageHero
        title="Download SmartLibDesk"
        subtitle="Android app for library owners and students — attendance, seats, fees, and Razorpay subscriptions."
        badge="📲 Download"
      />
      <section className="bg-white py-12 sm:py-16">
        <PageContainer size="lg">
          {apkReady === false ? (
            <GlassCard padding="md" className="mb-6 border-amber-200/80 !bg-amber-50/80">
              <p className="text-sm text-amber-950">
                APK file is not on the server yet (404). After building the app, run{' '}
                <code className="rounded bg-amber-100 px-1">cd website && npm run copy-apk</code>, commit{' '}
                <code className="rounded bg-amber-100 px-1">public/downloads/*.apk</code>, and redeploy Vercel — or set{' '}
                <code className="rounded bg-amber-100 px-1">VITE_APK_DOWNLOAD_URL</code> to a hosted APK link.
              </p>
            </GlassCard>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-2">
            <GlassCard padding="lg">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Android</p>
              <h2 className="font-display mt-2 text-2xl font-bold text-slate-900">SmartLibDesk v{APK_VERSION}</h2>
              <p className="mt-2 text-sm text-muted">{APK_SIZE} · Package com.smartlibdesk.app</p>

              <button type="button" className="mt-8 block w-full" onClick={startDownload} disabled={apkReady === false}>
                <Button fullWidth disabled={apkReady === false}>
                  Download APK
                </Button>
              </button>

              <p className="mt-4 text-xs text-muted">
                On Android: after scanning the QR, tap <strong>Download APK</strong> above. Chrome may ask to allow
                downloads.
              </p>

              <ol className="mt-10 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-600">
                <li>
                  Scan the QR (opens this page) or open{' '}
                  <a href={downloadPageUrl} className="font-semibold text-primary underline">
                    {downloadPageUrl.replace(/^https?:\/\//, '')}
                  </a>
                  .
                </li>
                <li>
                  Tap <strong>Download APK</strong> → open the file → <strong>Install</strong>.
                </li>
                <li>
                  If blocked: <strong>Settings → Security → Install unknown apps</strong> → allow Chrome or Files.
                </li>
                <li>
                  Open {SITE.name} → <strong>Login</strong> with your student username & PIN.
                </li>
                <li>
                  Tap <strong>Scan</strong> and point at the library attendance QR (
                  <Link to="/admin/attendance" className="font-semibold text-primary underline">
                    Admin → Attendance
                  </Link>
                  ).
                </li>
              </ol>
            </GlassCard>

            <GlassCard padding="lg" className="flex flex-col items-center justify-center text-center">
              <p className="text-sm font-semibold text-slate-900">Scan on your Android phone</p>
              <p className="mt-1 text-xs text-muted">Opens download page — then tap Download APK</p>
              <div className="mt-6">
                <QrImage data={downloadPageUrl} size={220} alt="Open SmartLibDesk download page" className="mx-auto" />
              </div>
              <p className="mt-6 max-w-xs break-all text-xs text-muted">{downloadPageUrl}</p>
              {apkReady ? (
                <p className="mt-3 text-xs font-medium text-emerald-700">APK is available on this server</p>
              ) : null}
            </GlassCard>
          </div>

          <GlassCard padding="lg" className="mt-8 !bg-primary/5">
            <h3 className="font-semibold text-slate-900">For library owners (website)</h3>
            <ul className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <li>
                <span className="font-medium text-slate-900">1. Add student</span>
                <br />
                <Link to="/admin/students" className="text-primary underline">
                  Admin → Students
                </Link>
              </li>
              <li>
                <span className="font-medium text-slate-900">2. Show QR</span>
                <br />
                <Link to="/admin/attendance" className="text-primary underline">
                  Admin → Attendance
                </Link>
              </li>
              <li>
                <span className="font-medium text-slate-900">3. Students scan</span>
                <br />
                Attendance QR in app — <strong>not</strong> this download QR
              </li>
            </ul>
          </GlassCard>

          <p className="mt-8 text-xs leading-relaxed text-muted">
            Library admins:{' '}
            <Link to="/login" className="font-semibold text-primary underline">
              smartlibdesk.in/login
            </Link>
            . Help:{' '}
            <a href={`mailto:${SITE.supportEmail}`} className="text-primary underline">
              {SITE.supportEmail}
            </a>
          </p>
        </PageContainer>
      </section>
    </>
  );
}
