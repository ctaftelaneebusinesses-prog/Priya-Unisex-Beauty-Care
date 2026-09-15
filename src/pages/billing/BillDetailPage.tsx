import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/Button";
import { InvoicePreview } from "@/features/billing/InvoicePreview";
import { billingService } from "@/services/billingService";
import { gstService, businessSettingsService } from "@/services/settingsService";
import { useToast } from "@/components/Toast";
import type { Bill, BusinessSettings, GSTSettings } from "@/types";

export function BillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [bill, setBill] = useState<Bill | null>(null);
  const [gst, setGst] = useState<GSTSettings | null>(null);
  const [business, setBusiness] = useState<BusinessSettings | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([billingService.getById(id), gstService.getSettings(), businessSettingsService.get()]).then(
      ([b, g, biz]) => {
        setBill(b ?? null);
        setGst(g);
        setBusiness(biz);
      }
    );
  }, [id]);

  const handleMarkPaid = async () => {
    if (!bill) return;
    await billingService.updatePaymentStatus(bill.id, "Paid", bill.grandTotal);
    showToast(`Invoice ${bill.invoiceNumber} marked as paid.`);
    setBill({ ...bill, paymentStatus: "Paid", amountPaid: bill.grandTotal, balanceDue: 0 });
  };

  if (!bill || !gst || !business) {
    return (
      <>
        <Header title="Invoice" />
        <PageContainer>
          <p className="text-sm text-ink-600">Loading invoice…</p>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Header title={`Invoice ${bill.invoiceNumber}`} subtitle={`Created by ${bill.createdByName}`} />
      <PageContainer>
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-950 transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
          {bill.paymentStatus !== "Paid" && bill.status === "COMPLETED" && (
            <Button size="sm" variant="secondary" icon={<CheckCircle2 size={14} />} onClick={handleMarkPaid}>
              Mark as Paid
            </Button>
          )}
        </div>

        <div className="max-w-3xl mx-auto">
          <InvoicePreview bill={bill} business={business} gst={gst} />
        </div>
      </PageContainer>
    </>
  );
}
