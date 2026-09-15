import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ExternalLink, Search, Save, Printer, Download, Landmark } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { FormField, Input, Select } from "@/components/Form";
import { Button } from "@/components/Button";
import { DashboardCard } from "@/components/DashboardCard";
import { billingService } from "@/services/billingService";
import { gstService } from "@/services/settingsService";
import { useToast } from "@/components/Toast";
import { getGSTReport } from "@/services/reportService";
import { filterBillsByRange } from "@/services/reportService";
import { resolveDateRange, resolveIndianFinancialYearRange, resolveQuarterRange } from "@/utils/dateRange";
import { formatCurrency } from "@/utils/currency";
import { exportToCsv } from "@/utils/csvExport";
import type { Bill, GSTSettings } from "@/types";

type GSTReportPeriod = "MONTH" | "QUARTER" | "FINANCIAL_YEAR" | "CUSTOM";

const GST_PORTAL_URL = "https://www.gst.gov.in/";
const GST_SEARCH_URL = "https://services.gst.gov.in/services/searchtp";

export function GSTPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<GSTSettings | null>(null);
  const [formState, setFormState] = useState<GSTSettings | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [period, setPeriod] = useState<GSTReportPeriod>("MONTH");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([gstService.getSettings(), billingService.getAll()]).then(([g, b]) => {
      setSettings(g);
      setFormState(g);
      setBills(b);
    });
  }, []);

  const range = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "MONTH":
        return resolveDateRange("THIS_MONTH");
      case "QUARTER":
        return resolveQuarterRange(now);
      case "FINANCIAL_YEAR":
        return resolveIndianFinancialYearRange(now);
      case "CUSTOM":
        return resolveDateRange("CUSTOM");
    }
  }, [period]);

  const scopedBills = useMemo(() => filterBillsByRange(bills, range), [bills, range]);
  const gstReport = useMemo(() => getGSTReport(scopedBills), [scopedBills]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!formState) return;
    setIsSaving(true);
    try {
      const updated = await gstService.updateSettings(formState);
      setSettings(updated);
      showToast("GST settings updated successfully.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    exportToCsv("gst-report", [
      {
        "Total Sales": gstReport.totalSales,
        "Taxable Sales": gstReport.taxableSales,
        CGST: gstReport.cgst,
        SGST: gstReport.sgst,
        IGST: gstReport.igst,
        "Total GST": gstReport.totalGst,
        "Bill Count": gstReport.billCount,
      },
    ]);
  };

  if (!formState || !settings) {
    return (
      <>
        <Header title="GST" />
        <PageContainer>
          <p className="text-sm text-ink-600">Loading…</p>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Header title="GST" subtitle="Configure tax settings and review GST collected across all bills." />
      <PageContainer>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="bg-white rounded-2xl border border-cream-200 shadow-card p-6">
            <h3 className="font-display text-lg text-ink-950 mb-4">GST Settings</h3>
            <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="GSTIN" required>
                <Input value={formState.gstin} onChange={(e) => setFormState({ ...formState, gstin: e.target.value })} />
              </FormField>
              <FormField label="Default GST Rate (%)" required>
                <Input
                  type="number"
                  min={0}
                  max={28}
                  value={formState.defaultGSTRatePercent}
                  onChange={(e) => setFormState({ ...formState, defaultGSTRatePercent: Number(e.target.value) })}
                />
              </FormField>
              <FormField label="Business Legal Name" required>
                <Input value={formState.legalName} onChange={(e) => setFormState({ ...formState, legalName: e.target.value })} />
              </FormField>
              <FormField label="Trade Name" required>
                <Input value={formState.tradeName} onChange={(e) => setFormState({ ...formState, tradeName: e.target.value })} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Business Address" required>
                  <Input value={formState.address} onChange={(e) => setFormState({ ...formState, address: e.target.value })} />
                </FormField>
              </div>
              <FormField label="State" required>
                <Input value={formState.state} onChange={(e) => setFormState({ ...formState, state: e.target.value })} />
              </FormField>
              <FormField label="State Code" required>
                <Input value={formState.stateCode} onChange={(e) => setFormState({ ...formState, stateCode: e.target.value })} />
              </FormField>
              <FormField label="Invoice Prefix" required>
                <Input value={formState.invoicePrefix} onChange={(e) => setFormState({ ...formState, invoicePrefix: e.target.value.toUpperCase() })} />
              </FormField>
              <FormField label="Next Invoice Number" required>
                <Input
                  type="number"
                  min={1}
                  value={formState.nextInvoiceNumber}
                  onChange={(e) => setFormState({ ...formState, nextInvoiceNumber: Number(e.target.value) })}
                />
              </FormField>

              <div className="sm:col-span-2 flex justify-end pt-2">
                <Button type="submit" icon={<Save size={16} />} disabled={isSaving}>
                  Save GST Settings
                </Button>
              </div>
            </form>
          </div>

          <div className="flex flex-col gap-5">
            <div className="bg-ink-950 text-white rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Landmark size={18} className="text-gold-400" />
                <h3 className="font-display text-lg">GST Portal</h3>
              </div>
              <p className="text-sm text-cream-200/70 mb-4">
                Verify GSTIN details or file returns directly on the official Government of India GST portal.
              </p>
              <div className="flex flex-col gap-2">
                <a href={GST_PORTAL_URL} target="_blank" rel="noopener noreferrer">
                  <Button variant="gold" fullWidth icon={<ExternalLink size={15} />}>
                    Open GST Portal
                  </Button>
                </a>
                <a href={GST_SEARCH_URL} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" fullWidth icon={<Search size={15} />}>
                    GSTIN Search / Verification
                  </Button>
                </a>
              </div>
              <p className="text-[11px] text-cream-200/40 mt-3">
                Verification happens on the official government portal — this software does not verify GSTIN itself.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="font-display text-lg text-ink-950">GST Report</h3>
            <div className="flex items-center gap-2">
              <Select value={period} onChange={(e) => setPeriod(e.target.value as GSTReportPeriod)} className="w-44">
                <option value="MONTH">This Month</option>
                <option value="QUARTER">This Quarter</option>
                <option value="FINANCIAL_YEAR">Financial Year</option>
                <option value="CUSTOM">All Time</option>
              </Select>
              <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>
                Print
              </Button>
              <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleExport}>
                Export
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <DashboardCard label="Total Sales" value={formatCurrency(gstReport.totalSales)} icon={<Landmark size={16} />} accent="gold" />
            <DashboardCard label="Taxable Sales" value={formatCurrency(gstReport.taxableSales)} icon={<Landmark size={16} />} accent="ink" />
            <DashboardCard label="CGST" value={formatCurrency(gstReport.cgst)} icon={<Landmark size={16} />} accent="ink" />
            <DashboardCard label="SGST / IGST" value={formatCurrency(gstReport.sgst + gstReport.igst)} icon={<Landmark size={16} />} accent="ink" />
            <DashboardCard label="Total GST" value={formatCurrency(gstReport.totalGst)} icon={<Landmark size={16} />} accent="wine" />
            <DashboardCard label="Bills" value={String(gstReport.billCount)} icon={<Landmark size={16} />} accent="sage" />
          </div>
        </div>
      </PageContainer>
    </>
  );
}
