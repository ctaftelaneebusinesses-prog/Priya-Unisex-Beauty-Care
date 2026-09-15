import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db } from "./db.js";
import { collectionStore, singletonStore } from "./collectionStore.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;

function id(): string {
  return randomUUID();
}

function round(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/** Mirrors src/utils/gst.ts calculateBillTotals so seeded bills use the same math as the live app. */
function calculateBillTotals(items: Doc[], additionalDiscountTotal: number, gstTaxType: "INTRA_STATE" | "INTER_STATE") {
  const subtotal = round(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
  const lineDiscountTotal = round(items.reduce((s, i) => s + i.discountAmount, 0));
  const preTaxableSubtotal = Math.max(0, subtotal - lineDiscountTotal);
  const cappedAdditionalDiscount = Math.min(additionalDiscountTotal, preTaxableSubtotal);

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let taxableAmount = 0;

  for (const item of items) {
    const lineGross = item.unitPrice * item.quantity - item.discountAmount;
    if (lineGross <= 0) continue;
    const share = preTaxableSubtotal > 0 ? (lineGross / preTaxableSubtotal) * cappedAdditionalDiscount : 0;
    const lineTaxable = Math.max(0, lineGross - share);
    const lineGst = (lineTaxable * item.gstRatePercent) / 100;
    taxableAmount += lineTaxable;
    if (gstTaxType === "INTRA_STATE") {
      cgstAmount += lineGst / 2;
      sgstAmount += lineGst / 2;
    } else {
      igstAmount += lineGst;
    }
  }

  taxableAmount = round(taxableAmount);
  cgstAmount = round(cgstAmount);
  sgstAmount = round(sgstAmount);
  igstAmount = round(igstAmount);
  const totalGstAmount = round(cgstAmount + sgstAmount + igstAmount);
  const discountAmount = round(lineDiscountTotal + cappedAdditionalDiscount);
  const grandTotal = round(taxableAmount + totalGstAmount);

  return { subtotal, lineDiscountTotal, discountAmount, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalGstAmount, grandTotal };
}

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}
function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

export function runSeed(): void {
  // ---------- Employees ----------
  const employees: Doc[] = [
    { id: "emp-grisha", name: "Grisha Kapoor", phone: "9820011223", email: "grisha@priyasalon.in", position: "Senior Beauty Professional", specialization: ["Hair Styling", "Makeup", "Facials"], joiningDate: "2022-03-10", workingHours: "10:00 AM - 8:00 PM", assignedServiceIds: [], status: "Active", canManageAppointments: true },
    { id: "emp-anu", name: "Anu Reddy", phone: "9845566778", email: "anu@priyasalon.in", position: "Hair Stylist", specialization: ["Haircut", "Hair Color", "Hair Treatments"], joiningDate: "2022-07-18", workingHours: "10:00 AM - 8:00 PM", assignedServiceIds: [], status: "Active", canManageAppointments: true },
    { id: "emp-meena", name: "Meena Iyer", phone: "9900112233", email: "meena@priyasalon.in", position: "Skin & Waxing Specialist", specialization: ["Waxing", "Skin Care"], joiningDate: "2023-01-05", workingHours: "10:00 AM - 7:00 PM", assignedServiceIds: [], status: "Active" },
    { id: "emp-kavya", name: "Kavya Nair", phone: "9880099887", email: "kavya@priyasalon.in", position: "Nail & Body Care Expert", specialization: ["Manicure", "Pedicure", "Massage Therapy"], joiningDate: "2023-05-20", workingHours: "11:00 AM - 8:00 PM", assignedServiceIds: [], status: "Active" },
    { id: "emp-rahul", name: "Rahul Verma", phone: "9765544332", email: "rahul@priyasalon.in", position: "Grooming Specialist", specialization: ["Beard Care", "Men's Styling", "Threading"], joiningDate: "2023-09-01", workingHours: "10:00 AM - 8:00 PM", assignedServiceIds: [], status: "Active" },
  ];

  // ---------- Services ----------
  const svc = (s: Doc): Doc => ({ gstRatePercent: 18, status: "Active", createdAt: "2024-01-01T00:00:00.000Z", ...s });
  const services: Doc[] = [
    svc({ id: "svc-haircut", name: "Haircut", category: "Hair Care & Styling", price: 400, durationMinutes: 30, gender: "Unisex", assignedEmployeeIds: ["emp-anu", "emp-rahul"] }),
    svc({ id: "svc-hair-styling", name: "Hair Styling", category: "Hair Care & Styling", price: 800, durationMinutes: 45, gender: "Unisex", assignedEmployeeIds: ["emp-grisha", "emp-rahul"] }),
    svc({ id: "svc-hair-wash", name: "Hair Wash", category: "Hair Care & Styling", price: 250, durationMinutes: 20, gender: "Unisex", assignedEmployeeIds: ["emp-anu"] }),
    svc({ id: "svc-hairspa", name: "Hairspa", category: "Hair Care & Styling", price: 1200, durationMinutes: 60, gender: "Unisex", assignedEmployeeIds: ["emp-anu"] }),
    svc({ id: "svc-hair-color", name: "Hair Color", category: "Hair Care & Styling", price: 1800, durationMinutes: 90, gender: "Unisex", assignedEmployeeIds: ["emp-anu", "emp-grisha"] }),
    svc({ id: "svc-hair-highlights", name: "Hair Highlights", category: "Hair Care & Styling", price: 2500, durationMinutes: 120, gender: "Unisex", assignedEmployeeIds: ["emp-anu", "emp-grisha"] }),
    svc({ id: "svc-hair-treatments", name: "Hair Treatments", category: "Hair Care & Styling", price: 2200, durationMinutes: 75, gender: "Unisex", assignedEmployeeIds: ["emp-anu"] }),
    svc({ id: "svc-facials", name: "Facials", category: "Skin & Facial Care", price: 1500, durationMinutes: 45, gender: "Unisex", assignedEmployeeIds: ["emp-meena", "emp-grisha"] }),
    svc({ id: "svc-hydra-facial", name: "Hydra Facial", category: "Skin & Facial Care", price: 2500, durationMinutes: 60, gender: "Unisex", assignedEmployeeIds: ["emp-grisha", "emp-meena"] }),
    svc({ id: "svc-clean-up", name: "Clean Up", category: "Skin & Facial Care", price: 900, durationMinutes: 30, gender: "Unisex", assignedEmployeeIds: ["emp-meena"] }),
    svc({ id: "svc-peels", name: "Peels", category: "Skin & Facial Care", price: 1800, durationMinutes: 40, gender: "Unisex", assignedEmployeeIds: ["emp-meena"] }),
    svc({ id: "svc-masks", name: "Masks", category: "Skin & Facial Care", price: 700, durationMinutes: 20, gender: "Unisex", assignedEmployeeIds: ["emp-meena"] }),
    svc({ id: "svc-bleach-dtan", name: "Bleach / D-Tan", category: "Skin & Facial Care", price: 600, durationMinutes: 25, gender: "Unisex", assignedEmployeeIds: ["emp-meena"] }),
    svc({ id: "svc-wax-underarms", name: "Underarms", category: "Waxing Services", price: 150, durationMinutes: 10, gender: "Unisex", assignedEmployeeIds: ["emp-meena"] }),
    svc({ id: "svc-wax-half-arms", name: "Half Arms", category: "Waxing Services", price: 300, durationMinutes: 15, gender: "Unisex", assignedEmployeeIds: ["emp-meena"] }),
    svc({ id: "svc-wax-full-arms", name: "Full Arms", category: "Waxing Services", price: 500, durationMinutes: 25, gender: "Unisex", assignedEmployeeIds: ["emp-meena"] }),
    svc({ id: "svc-wax-half-legs", name: "Half Legs", category: "Waxing Services", price: 400, durationMinutes: 20, gender: "Unisex", assignedEmployeeIds: ["emp-meena"] }),
    svc({ id: "svc-wax-full-legs", name: "Full Legs", category: "Waxing Services", price: 700, durationMinutes: 35, gender: "Unisex", assignedEmployeeIds: ["emp-meena"] }),
    svc({ id: "svc-wax-back-midriff", name: "Full Back / Mid Riff", category: "Waxing Services", price: 600, durationMinutes: 30, gender: "Unisex", assignedEmployeeIds: ["emp-meena"] }),
    svc({ id: "svc-wax-full-body", name: "Full Body", category: "Waxing Services", price: 2500, durationMinutes: 90, gender: "Unisex", assignedEmployeeIds: ["emp-meena"] }),
    svc({ id: "svc-wax-package-fa-fl-ua", name: "Full Waxing Package (FA + FL + UA)", category: "Waxing Services", price: 1400, durationMinutes: 60, gender: "Unisex", assignedEmployeeIds: ["emp-meena"], isPackage: true, packageComponentServiceIds: ["svc-wax-full-arms", "svc-wax-full-legs", "svc-wax-underarms"] }),
    svc({ id: "svc-manicure", name: "Manicure (Mani)", category: "Nails, Hands & Feet", price: 600, durationMinutes: 30, gender: "Unisex", assignedEmployeeIds: ["emp-kavya"] }),
    svc({ id: "svc-pedicure", name: "Pedicure (Pedi)", category: "Nails, Hands & Feet", price: 800, durationMinutes: 40, gender: "Unisex", assignedEmployeeIds: ["emp-kavya"] }),
    svc({ id: "svc-nail-art", name: "Nail Art / Polish", category: "Nails, Hands & Feet", price: 500, durationMinutes: 25, gender: "Unisex", assignedEmployeeIds: ["emp-kavya"] }),
    svc({ id: "svc-head-massage", name: "Head Massage", category: "Massage & Body Care", price: 400, durationMinutes: 20, gender: "Unisex", assignedEmployeeIds: ["emp-kavya"] }),
    svc({ id: "svc-reflexology", name: "Reflexology", category: "Massage & Body Care", price: 900, durationMinutes: 40, gender: "Unisex", assignedEmployeeIds: ["emp-kavya"] }),
    svc({ id: "svc-body-polish", name: "Body Polish", category: "Massage & Body Care", price: 2000, durationMinutes: 60, gender: "Unisex", assignedEmployeeIds: ["emp-kavya"] }),
    svc({ id: "svc-massage-polish", name: "Massage / Polish", category: "Massage & Body Care", price: 1800, durationMinutes: 50, gender: "Unisex", assignedEmployeeIds: ["emp-kavya"] }),
    svc({ id: "svc-threadings", name: "Threadings", category: "Grooming & Makeup", price: 100, durationMinutes: 10, gender: "Unisex", assignedEmployeeIds: ["emp-rahul", "emp-meena"] }),
    svc({ id: "svc-beard-care", name: "Beard Care", category: "Grooming & Makeup", price: 350, durationMinutes: 20, gender: "Male", assignedEmployeeIds: ["emp-rahul"] }),
    svc({ id: "svc-makeup", name: "Makeup", category: "Grooming & Makeup", price: 3500, durationMinutes: 90, gender: "Female", assignedEmployeeIds: ["emp-grisha"] }),
  ];
  for (const service of services) {
    for (const empId of service.assignedEmployeeIds) {
      const emp = employees.find((e) => e.id === empId);
      if (emp && !emp.assignedServiceIds.includes(service.id)) emp.assignedServiceIds.push(service.id);
    }
  }

  // ---------- Billable items (misc / small jewelry rentals inside the POS cart) ----------
  const billableItems: Doc[] = [
    { id: "item-hair-accessory", name: "Premium Hair Accessory Set", category: "Accessories", price: 800, status: "Active" },
  ];

  // ---------- Customers ----------
  const customers: Doc[] = [
    { id: "cust-priya-sharma", name: "Priya Sharma", phone: "9871234560", email: "priya.sharma@gmail.com", address: "204, Lotus Apartments, Andheri West, Mumbai", createdAt: "2024-06-10T00:00:00.000Z" },
    { id: "cust-neha-kulkarni", name: "Neha Kulkarni", phone: "9871234561", email: "neha.k@gmail.com", createdAt: "2024-07-02T00:00:00.000Z" },
    { id: "cust-rohan-mehta", name: "Rohan Mehta", phone: "9871234562", email: "rohan.mehta@gmail.com", createdAt: "2024-08-15T00:00:00.000Z" },
    { id: "cust-ananya-iyer", name: "Ananya Iyer", phone: "9871234563", email: "ananya.iyer@gmail.com", createdAt: "2024-09-20T00:00:00.000Z" },
    { id: "cust-vikram-singh", name: "Vikram Singh", phone: "9871234564", createdAt: "2024-10-05T00:00:00.000Z" },
    { id: "cust-sneha-patel", name: "Sneha Patel", phone: "9871234565", email: "sneha.patel@gmail.com", createdAt: "2024-11-11T00:00:00.000Z" },
    { id: "cust-arjun-rao", name: "Arjun Rao", phone: "9871234566", createdAt: "2024-12-01T00:00:00.000Z" },
    { id: "cust-divya-menon", name: "Divya Menon", phone: "9871234567", email: "divya.menon@gmail.com", createdAt: "2025-01-18T00:00:00.000Z" },
    { id: "cust-karan-malhotra", name: "Karan Malhotra", phone: "9871234568", createdAt: "2025-03-22T00:00:00.000Z" },
    { id: "cust-ritu-agarwal", name: "Ritu Agarwal", phone: "9871234569", email: "ritu.agarwal@gmail.com", createdAt: "2025-05-30T00:00:00.000Z" },
  ];

  // ---------- Membership plans (discount + wallet) ----------
  const membershipPlans: Doc[] = [
    { id: "plan-annual", name: "Annual Membership", type: "DISCOUNT", durationMonths: 12, price: 6000, benefitType: "PERCENT_DISCOUNT", benefitValue: 15, description: "15% off every visit for a full year across all services.", status: "Active" },
    { id: "plan-half-yearly", name: "Half-Yearly Membership", type: "DISCOUNT", durationMonths: 6, price: 3500, benefitType: "PERCENT_DISCOUNT", benefitValue: 10, description: "10% off every visit for 6 months.", status: "Active" },
    { id: "plan-quarterly-glow", name: "Quarterly Glow Card", type: "DISCOUNT", durationMonths: 3, price: 1800, benefitType: "FLAT_DISCOUNT", benefitValue: 200, description: "Flat ₹200 off on every bill for 3 months.", applicableCategories: ["Skin & Facial Care", "Hair Care & Styling"], status: "Active" },
    { id: "plan-wallet-5000", name: "Prepaid Wallet Card", type: "WALLET", durationMonths: 12, price: 5000, benefitType: "PERCENT_DISCOUNT", benefitValue: 0, walletCreditAmount: 5000, description: "Load ₹5,000 and pay for any service directly from your salon wallet.", status: "Active" },
  ];

  const customerMemberships: Doc[] = [
    { id: "MEM-00125", customerId: "cust-priya-sharma", planId: "plan-annual", purchaseDate: "2026-09-15", startDate: "2026-09-15", expiryDate: "2027-09-14", status: "ACTIVE", amountPaid: 6000 },
    { id: "MEM-00118", customerId: "cust-neha-kulkarni", planId: "plan-half-yearly", purchaseDate: "2026-04-01", startDate: "2026-04-01", expiryDate: "2026-09-30", status: "ACTIVE", amountPaid: 3500 },
    { id: "MEM-00104", customerId: "cust-vikram-singh", planId: "plan-quarterly-glow", purchaseDate: "2026-01-10", startDate: "2026-01-10", expiryDate: "2026-04-09", status: "EXPIRED", amountPaid: 1800 },
    { id: "MEM-00131", customerId: "cust-ananya-iyer", planId: "plan-wallet-5000", purchaseDate: "2026-08-01", startDate: "2026-08-01", expiryDate: "2027-07-31", status: "ACTIVE", amountPaid: 5000, walletBalance: 4200 },
  ];

  const walletTransactions: Doc[] = [
    { id: id(), membershipId: "MEM-00131", customerId: "cust-ananya-iyer", type: "PURCHASE", amountAdded: 5000, amountUsed: 0, previousBalance: 0, newBalance: 5000, date: "2026-08-01T11:00:00.000Z", notes: "Wallet card purchased" },
    { id: id(), membershipId: "MEM-00131", customerId: "cust-ananya-iyer", type: "USAGE", amountAdded: 0, amountUsed: 800, previousBalance: 5000, newBalance: 4200, date: "2026-08-20T15:30:00.000Z", notes: "Used on visit" },
  ];

  // ---------- Users ----------
  const rawUsers = [
    { id: "user-owner", name: "Priya Malhotra", email: "craftlanee@gmail.com", role: "OWNER" as const, password: "owner123" },
    { id: "user-grisha", name: "Grisha Kapoor", email: "grisha@priyasalon.in", role: "EMPLOYEE" as const, employeeId: "emp-grisha", password: "employee123" },
    { id: "user-anu", name: "Anu Reddy", email: "anu@priyasalon.in", role: "EMPLOYEE" as const, employeeId: "emp-anu", password: "employee123" },
  ];
  const insertUser = db.prepare(
    "INSERT INTO users (id, name, email, role, employeeId, passwordHash) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const u of rawUsers) {
    insertUser.run(u.id, u.name, u.email, u.role, "employeeId" in u ? u.employeeId! : null, bcrypt.hashSync(u.password, 10));
  }

  // ---------- Commission rules ----------
  const commissionRules: Doc[] = [
    { id: id(), scope: "GLOBAL", type: "PERCENTAGE", value: 10, status: "Active", createdAt: "2024-01-01T00:00:00.000Z" },
    { id: id(), scope: "EMPLOYEE", employeeId: "emp-grisha", type: "PERCENTAGE", value: 15, status: "Active", createdAt: "2024-01-01T00:00:00.000Z" },
    { id: id(), scope: "SERVICE", serviceId: "svc-makeup", type: "PERCENTAGE", value: 20, status: "Active", createdAt: "2024-01-01T00:00:00.000Z" },
  ];

  function resolveCommissionRule(employeeId: string, serviceId: string): Doc | undefined {
    const active = commissionRules.filter((r) => r.status === "Active");
    return (
      active.find((r) => r.scope === "EMPLOYEE_SERVICE" && r.employeeId === employeeId && r.serviceId === serviceId) ??
      active.find((r) => r.scope === "SERVICE" && r.serviceId === serviceId) ??
      active.find((r) => r.scope === "EMPLOYEE" && r.employeeId === employeeId) ??
      active.find((r) => r.scope === "GLOBAL")
    );
  }

  // ---------- Historical bills + commission records ----------
  const rnd = seededRandom(42);
  const bills: Doc[] = [];
  const commissionRecords: Doc[] = [];
  const paymentMethods = ["Cash", "UPI", "Card", "UPI", "Card", "Other"];
  const today = new Date("2026-09-15T18:00:00.000Z");
  let invoiceSeq = 1;

  for (let dayOffset = 75; dayOffset >= 0; dayOffset--) {
    const billsToday = Math.floor(rnd() * 4) + (dayOffset % 7 === 0 ? 3 : 1);
    for (let b = 0; b < billsToday; b++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(10 + Math.floor(rnd() * 9), Math.floor(rnd() * 60), 0, 0);

      const customer = pick(customers, rnd);
      const numServices = 1 + Math.floor(rnd() * 3);
      const chosenServiceIds = new Set<string>();
      while (chosenServiceIds.size < numServices) chosenServiceIds.add(pick(services, rnd).id);

      const items: Doc[] = Array.from(chosenServiceIds).map((serviceId) => {
        const service = services.find((s) => s.id === serviceId)!;
        const employeeId = pick(service.assignedEmployeeIds.length ? service.assignedEmployeeIds : employees.map((e) => e.id), rnd);
        const employee = employees.find((e) => e.id === employeeId);
        return {
          id: id(),
          type: "SERVICE",
          refId: service.id,
          name: service.name,
          employeeId,
          employeeName: employee?.name,
          quantity: 1,
          unitPrice: service.price,
          discountAmount: 0,
          gstRatePercent: service.gstRatePercent,
          durationMinutes: service.durationMinutes,
        };
      });

      const activeMembership = customerMemberships.find((m) => m.customerId === customer.id && m.status === "ACTIVE");
      const plan = activeMembership ? membershipPlans.find((p) => p.id === activeMembership.planId) : undefined;
      const subtotalBeforeDiscount = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const membershipDiscountAmount = plan && plan.type === "DISCOUNT"
        ? plan.benefitType === "PERCENT_DISCOUNT"
          ? (subtotalBeforeDiscount * plan.benefitValue) / 100
          : plan.benefitValue
        : 0;

      const totals = calculateBillTotals(items, membershipDiscountAmount, "INTRA_STATE");
      const paymentMethod = pick(paymentMethods, rnd);
      const isPending = rnd() < 0.06;
      const isPartial = !isPending && rnd() < 0.08;
      const paymentStatus = isPending ? "Pending" : isPartial ? "Partial" : "Paid";
      const amountPaid = paymentStatus === "Paid" ? totals.grandTotal : paymentStatus === "Partial" ? Math.round(totals.grandTotal * 0.5) : 0;
      const invoiceNumber = `PBC-${String(invoiceSeq).padStart(5, "0")}`;
      invoiceSeq++;

      const bill: Doc = {
        id: id(),
        invoiceNumber,
        date: date.toISOString(),
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        items,
        subtotal: totals.subtotal,
        discountAmount: totals.lineDiscountTotal,
        membershipId: activeMembership?.id,
        membershipDiscountAmount: membershipDiscountAmount || undefined,
        taxableAmount: totals.taxableAmount,
        cgstAmount: totals.cgstAmount,
        sgstAmount: totals.sgstAmount,
        igstAmount: totals.igstAmount,
        totalGstAmount: totals.totalGstAmount,
        grandTotal: totals.grandTotal,
        paymentMethod,
        paymentStatus,
        amountPaid,
        balanceDue: round(totals.grandTotal - amountPaid),
        gstTaxType: "INTRA_STATE",
        createdByUserId: "user-owner",
        createdByName: "Priya Malhotra",
        status: "COMPLETED",
      };
      bills.push(bill);

      for (const item of items) {
        if (!item.employeeId) continue;
        const rule = resolveCommissionRule(item.employeeId, item.refId);
        if (!rule) continue;
        const saleAmount = item.unitPrice * item.quantity - item.discountAmount;
        const commissionAmount = rule.type === "PERCENTAGE" ? round((saleAmount * rule.value) / 100) : rule.value;
        commissionRecords.push({
          id: id(),
          employeeId: item.employeeId,
          employeeName: item.employeeName,
          billId: bill.id,
          invoiceNumber: bill.invoiceNumber,
          serviceId: item.refId,
          serviceName: item.name,
          date: bill.date,
          saleAmount,
          commissionType: rule.type,
          commissionValue: rule.value,
          commissionAmount,
          status: dayOffset > 14 ? "Paid" : "Pending",
          paidDate: dayOffset > 14 ? bill.date : undefined,
        });
      }
    }
  }

  // ---------- Inventory ----------
  const inventoryProducts: Doc[] = [
    { id: "inv-hair-color", name: "Hair Color (Ammonia-Free)", category: "Hair Care", brand: "L'Oreal Professionnel", supplier: "Beauty Supplies Co.", quantity: 12, unit: "box", purchasePrice: 450, minStockLevel: 15, status: "Active", createdAt: "2025-01-01T00:00:00.000Z" },
    { id: "inv-shampoo", name: "Professional Shampoo 1L", category: "Hair Care", brand: "Matrix", supplier: "Beauty Supplies Co.", quantity: 22, unit: "bottle", purchasePrice: 620, minStockLevel: 8, status: "Active", createdAt: "2025-01-01T00:00:00.000Z" },
    { id: "inv-wax-strips", name: "Wax Strips (Pack of 100)", category: "Waxing", brand: "Parissa", supplier: "Salon Essentials", quantity: 4, unit: "pack", purchasePrice: 380, minStockLevel: 5, status: "Active", createdAt: "2025-01-01T00:00:00.000Z" },
    { id: "inv-nail-polish", name: "Nail Polish Set", category: "Nails", brand: "OPI", supplier: "Glam Distributors", quantity: 30, unit: "pcs", purchasePrice: 250, minStockLevel: 10, status: "Active", createdAt: "2025-01-01T00:00:00.000Z" },
    { id: "inv-bleach-powder", name: "Bleach Powder 500g", category: "Skin Care", brand: "VLCC", supplier: "Beauty Supplies Co.", quantity: 6, unit: "pack", purchasePrice: 300, minStockLevel: 6, status: "Active", createdAt: "2025-01-01T00:00:00.000Z" },
    { id: "inv-massage-oil", name: "Aromatherapy Massage Oil 1L", category: "Body Care", brand: "Forest Essentials", supplier: "Glam Distributors", quantity: 9, unit: "bottle", purchasePrice: 900, minStockLevel: 4, status: "Active", createdAt: "2025-01-01T00:00:00.000Z" },
  ];
  const stockTransactions: Doc[] = [
    { id: id(), productId: "inv-hair-color", productName: "Hair Color (Ammonia-Free)", type: "ADD", quantityChange: 20, quantityAfter: 20, reason: "Initial stock", date: "2025-01-05T10:00:00.000Z", performedByUserId: "user-owner", performedByName: "Priya Malhotra" },
    { id: id(), productId: "inv-hair-color", productName: "Hair Color (Ammonia-Free)", type: "REMOVE", quantityChange: -8, quantityAfter: 12, reason: "Used in services", date: "2026-08-20T12:00:00.000Z", performedByUserId: "user-owner", performedByName: "Priya Malhotra" },
    { id: id(), productId: "inv-wax-strips", productName: "Wax Strips (Pack of 100)", type: "ADD", quantityChange: 10, quantityAfter: 10, reason: "Initial stock", date: "2025-02-01T10:00:00.000Z", performedByUserId: "user-owner", performedByName: "Priya Malhotra" },
    { id: id(), productId: "inv-wax-strips", productName: "Wax Strips (Pack of 100)", type: "REMOVE", quantityChange: -6, quantityAfter: 4, reason: "Used in services", date: "2026-09-01T12:00:00.000Z", performedByUserId: "user-owner", performedByName: "Priya Malhotra" },
    { id: id(), productId: "inv-bleach-powder", productName: "Bleach Powder 500g", type: "ADJUST", quantityChange: -2, quantityAfter: 6, reason: "Stock count correction", date: "2026-09-05T09:00:00.000Z", performedByUserId: "user-owner", performedByName: "Priya Malhotra" },
  ];

  // ---------- Expenses ----------
  const expenses: Doc[] = [
    { id: id(), category: "Rent", description: "Shop rent — September", amount: 45000, date: "2026-09-01", paymentMethod: "Bank Transfer", referenceNumber: "RENT-SEP26", status: "Recorded", createdByUserId: "user-owner", createdByName: "Priya Malhotra", createdAt: "2026-09-01T09:00:00.000Z" },
    { id: id(), category: "Electricity", description: "Electricity bill — August", amount: 8200, date: "2026-08-28", paymentMethod: "UPI", status: "Recorded", createdByUserId: "user-owner", createdByName: "Priya Malhotra", createdAt: "2026-08-28T09:00:00.000Z" },
    { id: id(), category: "Salary", description: "Staff salaries — August", amount: 120000, date: "2026-08-31", paymentMethod: "Bank Transfer", status: "Recorded", createdByUserId: "user-owner", createdByName: "Priya Malhotra", createdAt: "2026-08-31T18:00:00.000Z" },
    { id: id(), category: "Product Purchase", description: "Hair color & shampoo restock", amount: 15600, date: "2026-09-05", paymentMethod: "Card", referenceNumber: "INV-8821", status: "Recorded", createdByUserId: "user-owner", createdByName: "Priya Malhotra", createdAt: "2026-09-05T11:00:00.000Z" },
    { id: id(), category: "Maintenance", description: "AC servicing", amount: 3500, date: "2026-09-08", paymentMethod: "Cash", status: "Recorded", createdByUserId: "user-owner", createdByName: "Priya Malhotra", createdAt: "2026-09-08T14:00:00.000Z" },
    { id: id(), category: "Internet", description: "Broadband — September", amount: 1499, date: "2026-09-02", paymentMethod: "UPI", status: "Recorded", createdByUserId: "user-owner", createdByName: "Priya Malhotra", createdAt: "2026-09-02T09:00:00.000Z" },
    { id: id(), category: "Marketing", description: "Instagram ad campaign", amount: 5000, date: "2026-09-10", paymentMethod: "Card", status: "Recorded", createdByUserId: "user-owner", createdByName: "Priya Malhotra", createdAt: "2026-09-10T16:00:00.000Z" },
    { id: id(), category: "Cleaning", description: "Housekeeping supplies", amount: 1200, date: "2026-09-12", paymentMethod: "Cash", status: "Recorded", createdByUserId: "user-owner", createdByName: "Priya Malhotra", createdAt: "2026-09-12T10:00:00.000Z" },
    { id: id(), category: "Equipment", description: "New hair dryer", amount: 6500, date: "2026-08-15", paymentMethod: "Card", status: "Recorded", createdByUserId: "user-owner", createdByName: "Priya Malhotra", createdAt: "2026-08-15T13:00:00.000Z" },
    { id: id(), category: "Rent", description: "Shop rent — August", amount: 45000, date: "2026-08-01", paymentMethod: "Bank Transfer", referenceNumber: "RENT-AUG26", status: "Recorded", createdByUserId: "user-owner", createdByName: "Priya Malhotra", createdAt: "2026-08-01T09:00:00.000Z" },
  ];

  // ---------- Jewellery rentals ----------
  const jewelleryItems: Doc[] = [
    { id: "jw-bridal-set", name: "Bridal Necklace Set", category: "Bridal", rentalPrice: 2500, securityDeposit: 5000, rentalDurationDays: 2, status: "RENTED", createdAt: "2025-01-01T00:00:00.000Z" },
    { id: "jw-kundan-earrings", name: "Kundan Earrings", category: "Earrings", rentalPrice: 800, securityDeposit: 1500, rentalDurationDays: 1, status: "AVAILABLE", createdAt: "2025-01-01T00:00:00.000Z" },
    { id: "jw-maang-tikka", name: "Maang Tikka", category: "Headpiece", rentalPrice: 600, securityDeposit: 1000, rentalDurationDays: 1, status: "RESERVED", createdAt: "2025-01-01T00:00:00.000Z" },
    { id: "jw-choker", name: "Antique Choker Set", category: "Necklace", rentalPrice: 1800, securityDeposit: 3500, rentalDurationDays: 2, status: "AVAILABLE", createdAt: "2025-01-01T00:00:00.000Z" },
  ];

  const jewelleryRentals: Doc[] = [
    {
      id: id(), jewelleryItemId: "jw-bridal-set", jewelleryItemName: "Bridal Necklace Set",
      customerId: "cust-priya-sharma", customerName: "Priya Sharma", employeeId: "emp-grisha", employeeName: "Grisha Kapoor",
      rentalDate: "2026-09-13T10:00:00.000Z", expectedReturnDate: "2026-09-15T10:00:00.000Z",
      rentalAmount: 2500, securityDeposit: 5000, status: "RENTED", createdAt: "2026-09-13T10:00:00.000Z",
    },
    {
      id: id(), jewelleryItemId: "jw-maang-tikka", jewelleryItemName: "Maang Tikka",
      customerId: "cust-neha-kulkarni", customerName: "Neha Kulkarni",
      rentalDate: "2026-09-14T10:00:00.000Z", expectedReturnDate: "2026-09-16T10:00:00.000Z",
      rentalAmount: 600, securityDeposit: 1000, status: "RESERVED", createdAt: "2026-09-14T10:00:00.000Z",
    },
    {
      id: id(), jewelleryItemId: "jw-kundan-earrings", jewelleryItemName: "Kundan Earrings",
      customerId: "cust-sneha-patel", customerName: "Sneha Patel", employeeId: "emp-meena", employeeName: "Meena Iyer",
      rentalDate: "2026-09-01T10:00:00.000Z", expectedReturnDate: "2026-09-02T10:00:00.000Z",
      rentalAmount: 800, securityDeposit: 1500, status: "RETURNED", createdAt: "2026-09-01T10:00:00.000Z",
      actualReturnDate: "2026-09-03T09:00:00.000Z", returnCondition: "DAMAGED", damageCharges: 500, otherPenalty: 0,
      depositReturned: 1000, finalRefundAmount: 1000, returnNotes: "One stone missing — ₹500 damage charge deducted.",
    },
  ];

  // ---------- Persist everything ----------
  collectionStore.replaceAll("employees", employees);
  collectionStore.replaceAll("services", services);
  collectionStore.replaceAll("customers", customers);
  collectionStore.replaceAll("membershipPlans", membershipPlans);
  collectionStore.replaceAll("customerMemberships", customerMemberships);
  collectionStore.replaceAll("walletTransactions", walletTransactions);
  collectionStore.replaceAll("billableItems", billableItems);
  collectionStore.replaceAll("appointments", []);
  collectionStore.replaceAll("employeeReviews", []);
  collectionStore.replaceAll("bills", bills);
  collectionStore.replaceAll("commissionRules", commissionRules);
  collectionStore.replaceAll("commissionRecords", commissionRecords);
  collectionStore.replaceAll("inventoryProducts", inventoryProducts);
  collectionStore.replaceAll("stockTransactions", stockTransactions);
  collectionStore.replaceAll("expenses", expenses);
  collectionStore.replaceAll("jewelleryItems", jewelleryItems);
  collectionStore.replaceAll("jewelleryRentals", jewelleryRentals);

  singletonStore.set("gst-settings", {
    gstin: "27AABCP1234M1Z5",
    legalName: "Priya Unisex Beauty Care Pvt. Ltd.",
    tradeName: "Priya UNISEX Beauty Care",
    address: "Shop No. 4, Sunshine Plaza, Andheri West, Mumbai, Maharashtra - 400058",
    state: "Maharashtra",
    stateCode: "27",
    invoicePrefix: "PBC",
    defaultGSTRatePercent: 18,
    businessStateCode: "27",
  });
  singletonStore.set("invoice-counter", { nextInvoiceNumber: bills.length + 1 });
  singletonStore.set("business-settings", {
    salonName: "Priya UNISEX Beauty Care",
    tagline: "Look Good. Feel Great.",
    phone: "+91 98765 43210",
    email: "priyabeautycare@raytcs.com",
    address: "Shop No. 4, Sunshine Plaza, Andheri West, Mumbai, Maharashtra - 400058",
    invoiceFooterNote: "Thank you for visiting Priya UNISEX Beauty Care. See you again soon!",
    currencySymbol: "₹",
  });
}
