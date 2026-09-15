import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Receipt, Tag, MapPinned, Wallet } from "lucide-react";
import { Header } from "@/layouts/Header";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Select, Input } from "@/components/Form";
import { CustomerSearch } from "@/features/billing/CustomerSearch";
import { ServiceSelector } from "@/features/billing/ServiceSelector";
import { BillCart } from "@/features/billing/BillCart";
import { PaymentSelector } from "@/features/billing/PaymentSelector";
import { InvoicePreview } from "@/features/billing/InvoicePreview";
import type { CartItem } from "@/features/billing/cartTypes";
import { useAuth } from "@/auth/AuthContext";
import { useToast } from "@/components/Toast";
import { serviceService } from "@/services/serviceService";
import { billableItemService } from "@/services/billableItemService";
import { employeeService } from "@/services/employeeService";
import { billingService } from "@/services/billingService";
import { customerService } from "@/services/customerService";
import { appointmentService } from "@/services/appointmentService";
import { membershipService, membershipPlanService } from "@/services/membershipService";
import { gstService, businessSettingsService } from "@/services/settingsService";
import { generateId } from "@/utils/id";
import { calculateBillTotals } from "@/utils/gst";
import { computeMembershipDiscount } from "@/utils/membershipDiscount";
import { formatCurrency } from "@/utils/currency";
import type {
  BillableItem,
  Bill,
  BusinessSettings,
  Customer,
  CustomerMembership,
  Employee,
  GSTSettings,
  GSTTaxType,
  MembershipPlan,
  PaymentMethod,
  PaymentStatus,
  SalonService,
} from "@/types";

type ActiveMembership = CustomerMembership & { plan?: MembershipPlan };

export function NewBillPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");

  const [services, setServices] = useState<SalonService[]>([]);
  const [billableItems, setBillableItems] = useState<BillableItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [gstSettings, setGstSettings] = useState<GSTSettings | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activeMembership, setActiveMembership] = useState<ActiveMembership | null>(null);
  const [walletMembership, setWalletMembership] = useState<CustomerMembership | null>(null);
  const [useWalletPayment, setUseWalletPayment] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [gstTaxType, setGstTaxType] = useState<GSTTaxType>("INTRA_STATE");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("Paid");
  const [amountPaid, setAmountPaid] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBill, setGeneratedBill] = useState<Bill | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([
      serviceService.getAll(),
      billableItemService.getAll(),
      employeeService.getAll(),
      gstService.getSettings(),
      businessSettingsService.get(),
    ]).then(([s, i, e, gst, biz]) => {
      setServices(s);
      setBillableItems(i);
      setEmployees(e);
      setGstSettings(gst);
      setBusinessSettings(biz);
    });
  }, []);

  useEffect(() => {
    if (!appointmentId || services.length === 0 || customer) return;
    (async () => {
      const appointment = await appointmentService.getById(appointmentId);
      if (!appointment) return;
      const [appointmentCustomer, service] = await Promise.all([
        customerService.getById(appointment.customerId),
        serviceService.getById(appointment.serviceId),
      ]);
      if (appointmentCustomer) {
        setCustomer(appointmentCustomer);
        const membership = await membershipService.getActiveForCustomer(appointmentCustomer.id);
        if (membership) {
          const plan = await membershipPlanService.getById(membership.planId);
          setActiveMembership({ ...membership, plan });
        }
      }
      if (service) {
        const employee = employees.find((e) => e.id === appointment.employeeId);
        setCartItems([
          {
            id: generateId(),
            type: "SERVICE",
            refId: service.id,
            name: service.name,
            employeeId: appointment.employeeId,
            employeeName: employee?.name,
            quantity: 1,
            unitPrice: service.price,
            discountAmount: 0,
            gstRatePercent: service.gstRatePercent,
            durationMinutes: service.durationMinutes,
            availableEmployeeIds: service.assignedEmployeeIds,
          },
        ]);
      }
    })();
  }, [appointmentId, services, employees, customer]);

  useEffect(() => {
    setUseWalletPayment(false);
    if (!customer) {
      setWalletMembership(null);
      return;
    }
    membershipService.getActiveWalletForCustomer(customer.id).then((m) => setWalletMembership(m ?? null));
  }, [customer]);

  const membershipDiscount = useMemo(
    () => computeMembershipDiscount(cartItems, activeMembership?.plan, services),
    [cartItems, activeMembership, services]
  );

  const totals = useMemo(
    () => calculateBillTotals(cartItems, manualDiscount + membershipDiscount, gstTaxType),
    [cartItems, manualDiscount, membershipDiscount, gstTaxType]
  );

  const walletAmountUsed = useMemo(() => {
    if (!useWalletPayment || !walletMembership) return 0;
    return Math.min(walletMembership.walletBalance ?? 0, totals.grandTotal);
  }, [useWalletPayment, walletMembership, totals.grandTotal]);

  const remainingAfterWallet = Math.max(0, totals.grandTotal - walletAmountUsed);
  const walletFullyCovers = walletAmountUsed > 0 && remainingAfterWallet === 0;

  useEffect(() => {
    if (walletFullyCovers) return;
    if (paymentStatus === "Paid") setAmountPaid(remainingAfterWallet);
    if (paymentStatus === "Pending") setAmountPaid(0);
  }, [remainingAfterWallet, paymentStatus, walletFullyCovers]);

  const handleAddService = (service: SalonService) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.refId === service.id && i.type === "SERVICE");
      if (existing) {
        return prev.map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      const newItem: CartItem = {
        id: generateId(),
        type: "SERVICE",
        refId: service.id,
        name: service.name,
        employeeId: service.assignedEmployeeIds.length === 1 ? service.assignedEmployeeIds[0] : undefined,
        employeeName:
          service.assignedEmployeeIds.length === 1
            ? employees.find((e) => e.id === service.assignedEmployeeIds[0])?.name
            : undefined,
        quantity: 1,
        unitPrice: service.price,
        discountAmount: 0,
        gstRatePercent: service.gstRatePercent,
        durationMinutes: service.durationMinutes,
        availableEmployeeIds: service.assignedEmployeeIds,
      };
      return [...prev, newItem];
    });
  };

  const handleAddItem = (item: BillableItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.refId === item.id && i.type === "ITEM");
      if (existing) {
        return prev.map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      const newItem: CartItem = {
        id: generateId(),
        type: "ITEM",
        refId: item.id,
        name: item.name,
        quantity: 1,
        unitPrice: item.price,
        discountAmount: 0,
        gstRatePercent: gstSettings?.defaultGSTRatePercent ?? 18,
      };
      return [...prev, newItem];
    });
  };

  const handleUpdateEmployee = (itemId: string, employeeId: string) => {
    setCartItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, employeeId, employeeName: employees.find((e) => e.id === employeeId)?.name }
          : i
      )
    );
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    setCartItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)));
  };

  const handleRemove = (itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const missingEmployee = cartItems.some((i) => i.type === "SERVICE" && !i.employeeId);
  const canGenerate = !!customer && cartItems.length > 0 && !missingEmployee && !isGenerating;

  const handleGenerateInvoice = async () => {
    if (!customer || !user) return;
    setIsGenerating(true);
    try {
      const bill = await billingService.create({
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        items: cartItems,
        additionalDiscountAmount: manualDiscount,
        membershipId: activeMembership?.id,
        membershipDiscountAmount: membershipDiscount || undefined,
        gstTaxType,
        paymentMethod: walletFullyCovers ? "Wallet" : paymentMethod,
        paymentStatus: walletFullyCovers ? "Paid" : paymentStatus,
        amountPaid: walletAmountUsed + amountPaid,
        walletMembershipId: walletAmountUsed > 0 ? walletMembership?.id : undefined,
        walletAmountUsed: walletAmountUsed > 0 ? walletAmountUsed : undefined,
        createdByUserId: user.id,
        createdByName: user.name,
        notes: notes.trim() || undefined,
        appointmentId: appointmentId ?? undefined,
      });
      showToast(`Invoice ${bill.invoiceNumber} generated successfully.`);
      const updatedGst = await gstService.getSettings();
      setGstSettings(updatedGst);
      setGeneratedBill(bill);
    } catch {
      showToast("Could not generate the invoice. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartNewBill = () => {
    setCustomer(null);
    setActiveMembership(null);
    setWalletMembership(null);
    setUseWalletPayment(false);
    setCartItems([]);
    setManualDiscount(0);
    setPaymentMethod("Cash");
    setPaymentStatus("Paid");
    setNotes("");
    setGeneratedBill(null);
  };

  return (
    <>
      <Header title="New Bill" subtitle="Build a fast, accurate bill for a walk-in or returning customer." />
      <PageContainer>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 items-start">
          <div className="flex flex-col gap-5 min-w-0">
            <CustomerSearch
              selectedCustomer={customer}
              activeMembership={activeMembership}
              onSelectCustomer={(c, m) => {
                setCustomer(c);
                setActiveMembership(m);
              }}
            />
            <ServiceSelector
              services={services}
              billableItems={billableItems}
              onAddService={handleAddService}
              onAddItem={handleAddItem}
            />
          </div>

          <div className="xl:sticky xl:top-6 bg-white rounded-2xl border border-cream-200 shadow-card p-5 flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-gold-500" />
              <h3 className="font-display text-lg text-ink-950">Bill Summary</h3>
            </div>

            <div className="max-h-[280px] overflow-y-auto -mx-1 px-1">
              <BillCart
                items={cartItems}
                employees={employees}
                onUpdateEmployee={handleUpdateEmployee}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
              />
            </div>

            {cartItems.length > 0 && (
              <>
                <div className="border-t border-cream-200 pt-4 flex flex-col gap-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Tag size={13} className="text-ink-600 shrink-0" />
                    <label className="text-xs text-ink-600 shrink-0">Manual Discount (₹)</label>
                    <Input
                      type="number"
                      min={0}
                      value={manualDiscount}
                      onChange={(e) => setManualDiscount(Math.max(0, Number(e.target.value)))}
                      className="!py-1 !text-xs ml-auto w-24 text-right"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPinned size={13} className="text-ink-600 shrink-0" />
                    <label className="text-xs text-ink-600 shrink-0">GST Type</label>
                    <Select
                      value={gstTaxType}
                      onChange={(e) => setGstTaxType(e.target.value as GSTTaxType)}
                      className="!py-1 !text-xs ml-auto w-40"
                    >
                      <option value="INTRA_STATE">Intra-State (CGST+SGST)</option>
                      <option value="INTER_STATE">Inter-State (IGST)</option>
                    </Select>
                  </div>

                  <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
                  {totals.lineDiscountTotal + manualDiscount > 0 && (
                    <SummaryRow label="Discount" value={`- ${formatCurrency(totals.lineDiscountTotal + manualDiscount)}`} muted />
                  )}
                  {membershipDiscount > 0 && (
                    <SummaryRow
                      label={`Membership (${activeMembership?.plan?.name})`}
                      value={`- ${formatCurrency(membershipDiscount)}`}
                      muted
                    />
                  )}
                  <SummaryRow label="Taxable Amount" value={formatCurrency(totals.taxableAmount)} />
                  {gstTaxType === "INTRA_STATE" ? (
                    <>
                      <SummaryRow label="CGST" value={formatCurrency(totals.cgstAmount)} />
                      <SummaryRow label="SGST" value={formatCurrency(totals.sgstAmount)} />
                    </>
                  ) : (
                    <SummaryRow label="IGST" value={formatCurrency(totals.igstAmount)} />
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-cream-200">
                    <span className="font-display text-lg text-ink-950">Grand Total</span>
                    <span className="font-display text-lg text-ink-950">{formatCurrency(totals.grandTotal)}</span>
                  </div>
                </div>

                {walletMembership && (walletMembership.walletBalance ?? 0) > 0 && (
                  <label className="flex items-center justify-between gap-2 bg-gold-50 rounded-xl px-3.5 py-2.5 cursor-pointer">
                    <span className="flex items-center gap-2 text-sm font-medium text-ink-800">
                      <Wallet size={15} className="text-gold-600" /> Use Wallet Balance ({formatCurrency(walletMembership.walletBalance ?? 0)} available)
                    </span>
                    <input
                      type="checkbox"
                      checked={useWalletPayment}
                      onChange={(e) => setUseWalletPayment(e.target.checked)}
                      className="w-4 h-4 accent-gold-500"
                    />
                  </label>
                )}

                {walletAmountUsed > 0 && (
                  <div className="text-sm flex flex-col gap-1.5">
                    <SummaryRow label="Paid via Wallet" value={`- ${formatCurrency(walletAmountUsed)}`} muted />
                    <div className="flex justify-between font-semibold text-ink-950">
                      <span>Remaining to Pay</span>
                      <span>{formatCurrency(remainingAfterWallet)}</span>
                    </div>
                  </div>
                )}

                {walletFullyCovers ? (
                  <p className="text-xs text-sage-600 bg-sage-50 rounded-lg px-3 py-2 font-medium">
                    Fully paid via wallet — no additional payment needed.
                  </p>
                ) : (
                  <PaymentSelector
                    method={paymentMethod}
                    status={paymentStatus}
                    grandTotal={remainingAfterWallet}
                    amountPaid={amountPaid}
                    onMethodChange={setPaymentMethod}
                    onStatusChange={setPaymentStatus}
                    onAmountPaidChange={setAmountPaid}
                  />
                )}

                {missingEmployee && (
                  <p className="text-xs text-wine-600 bg-wine-50 rounded-lg px-3 py-2">
                    Select an employee for every service before generating the invoice.
                  </p>
                )}
                {!customer && (
                  <p className="text-xs text-wine-600 bg-wine-50 rounded-lg px-3 py-2">
                    Select or add a customer to continue.
                  </p>
                )}

                <Button size="lg" variant="gold" fullWidth disabled={!canGenerate} onClick={handleGenerateInvoice}>
                  {isGenerating ? "Generating…" : "GENERATE INVOICE"}
                </Button>
              </>
            )}
          </div>
        </div>
      </PageContainer>

      <Modal
        isOpen={!!generatedBill}
        onClose={() => navigate("/billing/history")}
        title="Invoice Generated"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => navigate("/billing/history")}>
              Go to Bill History
            </Button>
            <Button onClick={handleStartNewBill}>Start New Bill</Button>
          </>
        }
      >
        {generatedBill && gstSettings && businessSettings && (
          <InvoicePreview bill={generatedBill} business={businessSettings} gst={gstSettings} />
        )}
      </Modal>
    </>
  );
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-sage-600" : "text-ink-600"}>{label}</span>
      <span className={muted ? "text-sage-600 font-medium" : "text-ink-800 font-medium"}>{value}</span>
    </div>
  );
}
