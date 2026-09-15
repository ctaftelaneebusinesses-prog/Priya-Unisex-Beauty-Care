import type { BusinessSettings, GSTSettings } from "@/types";
import { createSingletonStore } from "./storage";

/**
 * The invoice counter is split into its own singleton (separate from the rest
 * of GSTSettings) so that creating a bill — something both Owner and Employee
 * can do — only ever needs to increment a plain counter, never the GSTIN/rate
 * configuration itself. The backend enforces that split: `gst-settings` is
 * Owner-write-only, `invoice-counter` is writable by any authenticated user.
 */
type GSTConfig = Omit<GSTSettings, "nextInvoiceNumber">;
interface InvoiceCounter {
  nextInvoiceNumber: number;
}

const DEFAULT_GST_CONFIG: GSTConfig = {
  gstin: "",
  legalName: "",
  tradeName: "",
  address: "",
  state: "",
  stateCode: "",
  invoicePrefix: "INV",
  defaultGSTRatePercent: 18,
  businessStateCode: "",
};

const gstConfigStore = createSingletonStore<GSTConfig>("gst-settings", DEFAULT_GST_CONFIG);
const invoiceCounterStore = createSingletonStore<InvoiceCounter>("invoice-counter", { nextInvoiceNumber: 1 });
const businessSettingsStore = createSingletonStore<BusinessSettings>("business-settings", {
  salonName: "",
  tagline: "",
  phone: "",
  email: "",
  address: "",
  currencySymbol: "₹",
});

export const gstService = {
  async getSettings(): Promise<GSTSettings> {
    const [config, counter] = await Promise.all([gstConfigStore.get(), invoiceCounterStore.get()]);
    return { ...config, nextInvoiceNumber: counter.nextInvoiceNumber };
  },

  async updateSettings(patch: Partial<GSTSettings>): Promise<GSTSettings> {
    const { nextInvoiceNumber, ...configPatch } = patch;
    const currentConfig = await gstConfigStore.get();
    const updatedConfig = await gstConfigStore.set({ ...currentConfig, ...configPatch });
    let counter = await invoiceCounterStore.get();
    if (nextInvoiceNumber !== undefined) {
      counter = await invoiceCounterStore.set({ nextInvoiceNumber });
    }
    return { ...updatedConfig, nextInvoiceNumber: counter.nextInvoiceNumber };
  },

  async reserveNextInvoiceNumber(): Promise<{ invoiceNumber: string; settings: GSTSettings }> {
    const [config, counter] = await Promise.all([gstConfigStore.get(), invoiceCounterStore.get()]);
    const invoiceNumber = `${config.invoicePrefix}-${String(counter.nextInvoiceNumber).padStart(5, "0")}`;
    const updatedCounter = await invoiceCounterStore.set({ nextInvoiceNumber: counter.nextInvoiceNumber + 1 });
    return { invoiceNumber, settings: { ...config, nextInvoiceNumber: updatedCounter.nextInvoiceNumber } };
  },
};

export const businessSettingsService = {
  get: () => businessSettingsStore.get(),
  update: (patch: Partial<BusinessSettings>) =>
    businessSettingsStore.get().then((current) => businessSettingsStore.set({ ...current, ...patch })),
};
