import { LegalLayout } from '../components/LegalLayout';
import { SITE } from '../content/site';

export function Terms() {
  const updated = '19 May 2026';
  return (
    <LegalLayout title="Terms & Conditions">
      <p>
        <strong>Last updated:</strong> {updated}
      </p>
      <p>
        By using {SITE.name} (website, mobile app, or APIs), you agree to these terms. If you do not agree, do not
        use the service.
      </p>

      <h2>Service</h2>
      <p>
        {SITE.name} provides library management software for owners, staff, and students. Features include
        attendance, seating, notifications, and paid library subscriptions.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>Library admins are responsible for accuracy of student data they enter.</li>
        <li>You must keep login credentials confidential.</li>
        <li>We may suspend accounts that violate these terms or applicable law.</li>
      </ul>

      <h2>Payments</h2>
      <p>
        Paid library plans are billed through Razorpay. Prices are shown in INR. By paying, you authorize us and
        Razorpay to charge the selected plan amount. See our{' '}
        <a href="/refund-policy">Refund Policy</a> for cancellations and refunds.
      </p>

      <h2>Acceptable use</h2>
      <p>You may not misuse the platform, attempt unauthorized access, or upload unlawful content.</p>

      <h2>Disclaimer</h2>
      <p>
        The service is provided “as is”. We strive for uptime but do not guarantee uninterrupted availability. We
        are not liable for indirect damages to the extent permitted by law.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India. Disputes shall be subject to courts in India.</p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
      </p>
    </LegalLayout>
  );
}
