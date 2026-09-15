import { Printer, Download, Share2, Scissors } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/Button";
import { Badge, statusBadgeTone } from "@/components/Badge";
import { formatCurrency } from "@/utils/currency";
import { useToast } from "@/components/Toast";
import type { Bill, BusinessSettings, GSTSettings } from "@/types";

interface InvoicePreviewProps {
  bill: Bill;
  business: BusinessSettings;
  gst: GSTSettings;
  showActions?: boolean;
}

export function InvoicePreview({ bill, business, gst, showActions = true }: InvoicePreviewProps) {
  const { showToast } = useToast();

  const handlePrint = () => window.print();

  const handleShare = async () => {
    const summary = `Invoice ${bill.invoiceNumber} — ${business.salonName}\nCustomer: ${bill.customerName}\nTotal: ${formatCurrency(bill.grandTotal)}\nStatus: ${bill.paymentStatus}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Invoice ${bill.invoiceNumber}`, text: summary });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(summary);
    showToast("Invoice summary copied to clipboard.");
  };

  return (
    <div>
      {showActions && (
        <div className="flex items-center justify-end gap-2 mb-4 print:hidden">
          <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={handlePrint}>
            Print Invoice
          </Button>
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handlePrint}>
            Download Invoice
          </Button>
          <Button variant="secondary" size="sm" icon={<Share2 size={14} />} onClick={handleShare}>
            Share Invoice
          </Button>
        </div>
      )}

      <div className="invoice-print-area bg-white rounded-2xl border border-cream-200 p-8 print:border-0 print:p-0 print:rounded-none">
        <div className="flex items-start justify-between pb-6 border-b-2 border-ink-950">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-ink-950 text-gold-300 flex items-center justify-center shrink-0">
              <Scissors size={22} />
            </div>
            <div>
              <h2 className="font-display text-2xl text-ink-950">{business.salonName}</h2>
              <p className="text-xs text-ink-600">{business.tagline}</p>
            </div>
          </div>
          <div className="text-right text-xs text-ink-600 leading-relaxed max-w-[220px]">
            <p>{business.address}</p>
            <p>{business.phone}</p>
            <p>{business.email}</p>
            <p className="font-semibold text-ink-800 mt-1">GSTIN: {gst.gstin}</p>
          </div>
        </div>

        <div className="flex items-start justify-between py-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-600 font-semibold mb-1">Billed To</p>
            <p className="text-sm font-semibold text-ink-950">{bill.customerName}</p>
            <p className="text-sm text-ink-600">{bill.customerPhone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-ink-600 font-semibold mb-1">Invoice</p>
            <p className="text-sm font-semibold text-ink-950">{bill.invoiceNumber}</p>
            <p className="text-sm text-ink-600">{format(new Date(bill.date), "d MMM yyyy, h:mm a")}</p>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-ink-950/20 text-xs uppercase tracking-wide text-ink-600">
              <th className="text-left py-2 font-semibold">Service</th>
              <th className="text-left py-2 font-semibold">Employee</th>
              <th className="text-center py-2 font-semibold">Qty</th>
              <th className="text-right py-2 font-semibold">Price</th>
              <th className="text-right py-2 font-semibold">Discount</th>
              <th className="text-right py-2 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item) => (
              <tr key={item.id} className="border-b border-cream-200">
                <td className="py-2.5 text-ink-950 font-medium">{item.name}</td>
                <td className="py-2.5 text-ink-600">{item.employeeName ?? "—"}</td>
                <td className="py-2.5 text-center text-ink-700">{item.quantity}</td>
                <td className="py-2.5 text-right text-ink-700">{formatCurrency(item.unitPrice)}</td>
                <td className="py-2.5 text-right text-ink-700">
                  {item.discountAmount > 0 ? formatCurrency(item.discountAmount) : "—"}
                </td>
                <td className="py-2.5 text-right font-semibold text-ink-950">
                  {formatCurrency(item.unitPrice * item.quantity - item.discountAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatCurrency(bill.subtotal)} />
            {bill.discountAmount > 0 && (
              <Row label="Discount" value={`- ${formatCurrency(bill.discountAmount)}`} muted />
            )}
            {bill.membershipDiscountAmount ? (
              <Row label="Membership Benefit" value={`- ${formatCurrency(bill.membershipDiscountAmount)}`} muted />
            ) : null}
            <Row label="Taxable Amount" value={formatCurrency(bill.taxableAmount)} />
            {bill.gstTaxType === "INTRA_STATE" ? (
              <>
                <Row label="CGST" value={formatCurrency(bill.cgstAmount)} />
                <Row label="SGST" value={formatCurrency(bill.sgstAmount)} />
              </>
            ) : (
              <Row label="IGST" value={formatCurrency(bill.igstAmount)} />
            )}
            <div className="flex justify-between items-center pt-2 mt-1 border-t-2 border-ink-950">
              <span className="font-display text-lg text-ink-950">Grand Total</span>
              <span className="font-display text-lg text-ink-950">{formatCurrency(bill.grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-cream-200">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-600">Payment Method:</span>
            <span className="text-xs font-semibold text-ink-950">{bill.paymentMethod}</span>
          </div>
          <Badge tone={statusBadgeTone(bill.paymentStatus)}>{bill.paymentStatus}</Badge>
        </div>

        {business.invoiceFooterNote && (
          <p className="text-center text-xs text-ink-600 mt-8">{business.invoiceFooterNote}</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-sage-600" : "text-ink-600"}>{label}</span>
      <span className={muted ? "text-sage-600 font-medium" : "text-ink-800 font-medium"}>{value}</span>
    </div>
  );
}
