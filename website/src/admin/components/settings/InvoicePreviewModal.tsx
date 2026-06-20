import { Button } from '../../../components/ui/Button';
import { SITE } from '../../../content/site';
import type { InvoiceData } from '../../utils/billingHelpers';
import {
  buildInvoiceHtml,
  downloadInvoiceHtml,
  invoiceStatusMeta,
  printInvoiceHtml,
  shareInvoiceHtml,
  formatMoney,
  AUTHORIZED_SIGNATURE,
} from '../../utils/billingHelpers';

type InvoicePreviewModalProps = {
  open: boolean;
  invoice: InvoiceData | null;
  onClose: () => void;
};

export function InvoicePreviewModal({ open, invoice, onClose }: InvoicePreviewModalProps) {
  if (!open || !invoice) return null;

  const status = invoiceStatusMeta(invoice.status);
  const html = buildInvoiceHtml(invoice);
  const fileName = invoice.invoiceNumber;

  return (
    <div className="billing-invoice-overlay fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4">
      <div className="billing-invoice-shell flex h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0f172a] shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Invoice preview</p>
            <h2 className="font-display text-xl font-bold text-white">{invoice.invoiceNumber}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => downloadInvoiceHtml(html, fileName)}
            >
              Download PDF
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => shareInvoiceHtml(html, fileName).catch(() => downloadInvoiceHtml(html, fileName))}
            >
              Share Invoice
            </Button>
            <Button type="button" size="sm" onClick={() => printInvoiceHtml(html)}>
              Print Invoice
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
              aria-label="Close invoice preview"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="billing-invoice-paper mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl">
            <div className="billing-invoice-header bg-gradient-to-br from-violet-700 to-purple-600 px-6 py-6 text-white sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-2xl font-bold tracking-tight">{SITE.name}</p>
                  <p className="mt-1 text-sm text-white/80">
                    {SITE.supportEmail} · smartlibdesk.in
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">Invoice</p>
                  <p className="mt-1 text-sm text-white/90">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-white/80">Date: {invoice.date}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 sm:px-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Bill To</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{invoice.billTo.libraryName}</p>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-700">Owner:</span> {invoice.billTo.ownerName}</p>
                  <p><span className="font-semibold text-slate-700">Email:</span> {invoice.billTo.email}</p>
                  <p><span className="font-semibold text-slate-700">Phone:</span> {invoice.billTo.phone}</p>
                  <p>{invoice.billTo.address}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Subscription Details</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{invoice.planLabel}</p>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-700">Duration:</span> {invoice.durationLabel}</p>
                  <p><span className="font-semibold text-slate-700">Start:</span> {invoice.startDate}</p>
                  <p><span className="font-semibold text-slate-700">Expiry:</span> {invoice.expiryDate}</p>
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-8">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Amount Breakdown</p>
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-slate-600">Plan Price</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatMoney(invoice.breakdown.planPrice)}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-slate-600">Discount</td>
                      <td className="px-4 py-3 text-right font-semibold">-{formatMoney(invoice.breakdown.discount)}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-slate-600">Subtotal</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatMoney(invoice.breakdown.subtotal)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-base font-bold text-violet-700">Total</td>
                      <td className="px-4 py-3 text-right text-base font-bold text-violet-700">
                        {formatMoney(invoice.breakdown.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 grid gap-6 px-6 sm:grid-cols-2 sm:px-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Payment Method</p>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <p><span className="font-semibold text-slate-700">Method:</span> {invoice.method}</p>
                  <p><span className="font-semibold text-slate-700">Transaction ID:</span> {invoice.transactionId}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Payment Status</p>
                <div className="mt-3">
                  <span className={status.badge}>
                    <span className={`mr-2 inline-block h-2 w-2 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-200 px-6 py-6 text-center text-sm font-semibold text-slate-500 sm:px-8">
              Thank you for choosing {SITE.name}
            </div>

            <div className="flex flex-wrap items-end justify-between gap-6 border-t border-slate-200 px-6 py-6 sm:px-8">
              <p className="max-w-md text-xs leading-relaxed text-slate-500">
                <span className="font-bold text-slate-600">Terms &amp; Conditions.</span>{' '}
                This invoice is generated electronically and is valid without a physical signature.
                For billing support, contact {SITE.supportEmail}.
              </p>
              <div className="text-right">
                <p className="billing-signature text-3xl text-slate-700">{AUTHORIZED_SIGNATURE}</p>
                <div className="mt-2 border-t border-slate-300 pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Authorized Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
