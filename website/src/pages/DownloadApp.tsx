import { Link } from 'react-router-dom';
import { PageHero } from '../components/PageHero';
import { QrImage } from '../components/QrImage';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { PageContainer } from '../components/ui/PageContainer';
import { SITE } from '../content/site';
import { APP_VERSION, getPlayStoreUrl, PLAY_STORE_PACKAGE_ID } from '../lib/appDownload';

const PLAY_STORE_URL = getPlayStoreUrl();

export function DownloadApp() {
  return (
    <>
      <PageHero
        title="Get SmartLibDesk on Android"
        subtitle="Install from Google Play — attendance, seats, fees, and Razorpay subscriptions for library owners and students."
        badge="📲 Download"
      />
      <section className="gradient-mesh border-b border-white/10 py-12 sm:py-16">
        <PageContainer size="lg">
          <div className="grid gap-8 lg:grid-cols-2">
            <GlassCard dark padding="lg">
              <p className="text-sm font-semibold uppercase tracking-wider text-teal-300">Google Play</p>
              <h2 className="font-display mt-2 text-2xl font-bold text-white">SmartLibDesk v{APP_VERSION}</h2>
              <p className="mt-2 text-sm text-white/60">Free on Google Play · Package {PLAY_STORE_PACKAGE_ID}</p>

              <a href={PLAY_STORE_URL} className="mt-8 block" rel="noopener noreferrer">
                <Button fullWidth>Get it on Google Play</Button>
              </a>

              <p className="mt-4 text-xs text-white/60">
                On Android this opens the Play Store app. Tap <strong className="text-white/80">Install</strong> to download
                SmartLibDesk.
              </p>

              <ol className="mt-10 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-white/70">
                <li>
                  Scan the QR or tap <strong className="text-white/85">Get it on Google Play</strong> above.
                </li>
                <li>
                  Or open{' '}
                  <a href={PLAY_STORE_URL} className="font-semibold text-teal-300 underline hover:text-teal-200">
                    SmartLibDesk on Google Play
                  </a>
                  .
                </li>
                <li>
                  Tap <strong className="text-white/85">Install</strong> → open the app → <strong className="text-white/85">Login</strong>{' '}
                  with your student username & PIN.
                </li>
                <li>
                  Tap <strong className="text-white/85">Scan</strong> and point at the library attendance QR (
                  <Link to="/admin/attendance" className="font-semibold text-teal-300 underline hover:text-teal-200">
                    Admin → Attendance
                  </Link>
                  ).
                </li>
              </ol>
            </GlassCard>

            <GlassCard dark padding="lg" className="flex flex-col items-center justify-center text-center">
              <p className="text-sm font-semibold text-white">Scan on your Android phone</p>
              <p className="mt-1 text-xs text-white/60">Opens Google Play — tap Install</p>
              <div className="mt-6">
                <QrImage data={PLAY_STORE_URL} size={220} alt="SmartLibDesk on Google Play" className="mx-auto" />
              </div>
              <p className="mt-6 max-w-xs break-all text-xs text-white/60">{PLAY_STORE_URL}</p>
              <p className="mt-3 text-xs font-medium text-emerald-300">Available on Google Play</p>
            </GlassCard>
          </div>

          <GlassCard dark padding="lg" className="mt-8">
            <h3 className="font-semibold text-white">For library owners (website)</h3>
            <ul className="mt-4 grid gap-3 text-sm text-white/70 sm:grid-cols-3">
              <li>
                <span className="font-medium text-white">1. Add student</span>
                <br />
                <Link to="/admin/students" className="text-teal-300 underline hover:text-teal-200">
                  Admin → Students
                </Link>
              </li>
              <li>
                <span className="font-medium text-white">2. Show QR</span>
                <br />
                <Link to="/admin/attendance" className="text-teal-300 underline hover:text-teal-200">
                  Admin → Attendance
                </Link>
              </li>
              <li>
                <span className="font-medium text-white">3. Students scan</span>
                <br />
                Share this page or the Play Store QR — attendance QR is inside the app
              </li>
            </ul>
          </GlassCard>

          <p className="mt-8 text-xs leading-relaxed text-white/60">
            Library admins:{' '}
            <Link to="/login" className="font-semibold text-teal-300 underline hover:text-teal-200">
              smartlibdesk.in/login
            </Link>
            . Help:{' '}
            <a href={`mailto:${SITE.supportEmail}`} className="text-teal-300 underline hover:text-teal-200">
              {SITE.supportEmail}
            </a>
          </p>
        </PageContainer>
      </section>
    </>
  );
}
