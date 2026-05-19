import { LegalLayout } from '../components/LegalLayout';
import { SITE } from '../content/site';

export function RefundPolicy() {
  const updated = '19 May 2026';
  return (
    <LegalLayout title="Refund Policy">
      <p>
        <strong>Last updated:</strong> {updated}
      </p>
      <p>
        This policy applies to library subscription payments made for {SITE.name} through Razorpay.
      </p>

      <h2>Subscription purchases</h2>
      <p>
        When a library purchases a plan (Trial, Monthly, 6 Month, or Yearly), access is activated after successful
        payment verification. Plan duration and pricing are displayed before checkout in the app.
      </p>

      <h2>Refunds</h2>
      <ul>
        <li>
          <strong>Duplicate charges:</strong> Contact us within 7 days with payment proof for a full refund of the
          duplicate amount.
        </li>
        <li>
          <strong>Technical failure:</strong> If payment was deducted but the plan was not activated, we will verify
          with Razorpay and either activate the plan or issue a refund within 7–10 business days.
        </li>
        <li>
          <strong>Change of mind:</strong> Subscription fees are generally non-refundable once the plan period has
          started, except where required by applicable law.
        </li>
      </ul>

      <h2>Cancellations</h2>
      <p>
        Libraries may choose not to renew at the end of the current billing period. No automatic refund is provided
        for unused days within an active period unless agreed in writing.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Email <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> with your library name, registered
        email, Razorpay payment ID, and reason. We will respond within 3 business days.
      </p>

      <h2>Razorpay</h2>
      <p>
        Refunds, when approved, are processed back to the original payment method via Razorpay. Bank/UPI timelines
        depend on your provider (typically 5–7 business days).
      </p>
    </LegalLayout>
  );
}
