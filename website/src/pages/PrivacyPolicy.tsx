import { LegalLayout } from '../components/LegalLayout';
import { SITE } from '../content/site';

export function PrivacyPolicy() {
  const updated = '19 May 2026';
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        <strong>Last updated:</strong> {updated}
      </p>
      <p>
        {SITE.company} (“we”, “us”) operates {SITE.name} and this website. This policy explains how we collect,
        use, and protect information when you use our services.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Library & admin data:</strong> name, email, phone, library details, and account credentials.
        </li>
        <li>
          <strong>Student data:</strong> name, contact details, membership plan, and attendance records as entered
          by the library.
        </li>
        <li>
          <strong>Payment data:</strong> subscription payments are processed by Razorpay. We store transaction
          references (order ID, payment ID) but not full card or UPI credentials.
        </li>
        <li>
          <strong>Website contact form:</strong> name, email, phone (optional), and message you submit.
        </li>
        <li>
          <strong>Technical data:</strong> device type, app version, and logs needed for security and support.
        </li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>Provide and improve {SITE.name} features</li>
        <li>Process subscriptions and support requests</li>
        <li>Send service-related notifications and OTP emails</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We do not sell personal data. We share data only with service providers necessary to run the product (e.g.
        hosting, MongoDB Atlas, Razorpay, Resend for email) under appropriate agreements.
      </p>

      <h2>Retention & security</h2>
      <p>
        We retain data while your account is active and as required by law. We use encryption in transit (HTTPS)
        and access controls on our servers.
      </p>

      <h2>Your rights</h2>
      <p>
        You may request access, correction, or deletion of your data by contacting{' '}
        <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
      </p>

      <h2>Contact</h2>
      <p>
        {SITE.company}
        <br />
        Email: <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
      </p>
    </LegalLayout>
  );
}
