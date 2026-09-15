import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Save, Building2 } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { FormField, Input, TextArea } from "@/components/Form";
import { Button } from "@/components/Button";
import { businessSettingsService } from "@/services/settingsService";
import { useToast } from "@/components/Toast";
import type { BusinessSettings } from "@/types";

export function SettingsPage() {
  const { showToast } = useToast();
  const [formState, setFormState] = useState<BusinessSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    businessSettingsService.get().then(setFormState);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formState) return;
    setIsSaving(true);
    try {
      await businessSettingsService.update(formState);
      showToast("Business settings updated successfully.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!formState) {
    return (
      <>
        <Header title="Settings" />
        <PageContainer>
          <p className="text-sm text-ink-600">Loading…</p>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Header title="Settings" subtitle="Manage business details shown on every invoice." />
      <PageContainer>
        <div className="max-w-2xl bg-white rounded-2xl border border-cream-200 shadow-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Building2 size={18} className="text-gold-500" />
            <h3 className="font-display text-lg text-ink-950">Business Details</h3>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FormField label="Salon Name" required>
                <Input value={formState.salonName} onChange={(e) => setFormState({ ...formState, salonName: e.target.value })} />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField label="Tagline">
                <Input value={formState.tagline} onChange={(e) => setFormState({ ...formState, tagline: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Phone" required>
              <Input value={formState.phone} onChange={(e) => setFormState({ ...formState, phone: e.target.value })} />
            </FormField>
            <FormField label="Email" required>
              <Input type="email" value={formState.email} onChange={(e) => setFormState({ ...formState, email: e.target.value })} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Address" required>
                <TextArea rows={2} value={formState.address} onChange={(e) => setFormState({ ...formState, address: e.target.value })} />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField label="Invoice Footer Note" hint="Shown at the bottom of every invoice">
                <TextArea
                  rows={2}
                  value={formState.invoiceFooterNote ?? ""}
                  onChange={(e) => setFormState({ ...formState, invoiceFooterNote: e.target.value })}
                />
              </FormField>
            </div>
            <FormField label="Currency Symbol" required>
              <Input value={formState.currencySymbol} onChange={(e) => setFormState({ ...formState, currencySymbol: e.target.value })} />
            </FormField>

            <div className="sm:col-span-2 flex justify-end pt-2">
              <Button type="submit" icon={<Save size={16} />} disabled={isSaving}>
                Save Settings
              </Button>
            </div>
          </form>
        </div>
      </PageContainer>
    </>
  );
}
