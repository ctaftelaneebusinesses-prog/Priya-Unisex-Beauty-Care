// ==================== AUTH & ROLES ====================

export type UserRole = "OWNER" | "EMPLOYEE";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string; // linked employee record, if role === EMPLOYEE
  photoUrl?: string;
}

// ==================== SHARED / ENUM-LIKE UNIONS ====================

export type Gender = "Male" | "Female" | "Unisex";
export type RecordStatus = "Active" | "Inactive";
export type PaymentMethod = "Cash" | "UPI" | "Card" | "Wallet" | "Other";
export type PaymentStatus = "Paid" | "Partial" | "Pending";
export type AppointmentStatus =
  | "Pending"
  | "Confirmed"
  | "Completed"
  | "Cancelled"
  | "No Show";
export type MembershipStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "CANCELLED";
export type GSTTaxType = "INTRA_STATE" | "INTER_STATE"; // CGST+SGST vs IGST

export const SERVICE_CATEGORIES = [
  "Hair Care & Styling",
  "Skin & Facial Care",
  "Waxing Services",
  "Nails, Hands & Feet",
  "Massage & Body Care",
  "Grooming & Makeup",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

// ==================== SERVICES ====================

export interface SalonService {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  durationMinutes: number;
  gender: Gender;
  description?: string;
  assignedEmployeeIds: string[];
  gstRatePercent: number; // total GST %, split into CGST/SGST or IGST at billing time
  status: RecordStatus;
  isPackage?: boolean;
  packageComponentServiceIds?: string[]; // for combo/package services
  createdAt: string;
}

// ==================== EMPLOYEES ====================

export interface Employee {
  id: string;
  name: string;
  phone: string;
  email: string;
  photoUrl?: string;
  position: string;
  specialization: string[];
  joiningDate: string;
  workingHours: string; // e.g. "10:00 AM - 8:00 PM"
  assignedServiceIds: string[];
  status: RecordStatus;
  canManageAppointments?: boolean;
}

export interface EmployeeReview {
  id: string;
  employeeId: string;
  customerId: string;
  billId?: string;
  rating: number; // 1-5
  comment?: string;
  date: string;
}

// ==================== CUSTOMERS ====================

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt: string;
  notes?: string;
}

// ==================== MEMBERSHIPS ====================

export type MembershipBenefitType = "PERCENT_DISCOUNT" | "FLAT_DISCOUNT";
export type MembershipPlanType = "DISCOUNT" | "WALLET";

export interface MembershipPlan {
  id: string;
  name: string;
  type: MembershipPlanType; // DISCOUNT = recurring % / flat off; WALLET = prepaid balance card
  durationMonths: number;
  price: number; // amount the customer pays to purchase this plan
  benefitType: MembershipBenefitType; // used when type === "DISCOUNT"
  benefitValue: number; // percent (0-100) or flat rupee amount, used when type === "DISCOUNT"
  walletCreditAmount?: number; // used when type === "WALLET" — balance credited on purchase (may exceed price as a bonus)
  applicableCategories?: ServiceCategory[]; // empty/undefined = all categories
  description?: string;
  status: RecordStatus;
}

export interface CustomerMembership {
  id: string; // e.g. MEM-00125
  customerId: string;
  planId: string;
  purchaseDate: string;
  startDate: string;
  expiryDate: string;
  status: MembershipStatus;
  amountPaid: number;
  walletBalance?: number; // remaining prepaid balance, only present for WALLET-type memberships
}

export type WalletTransactionType = "PURCHASE" | "TOPUP" | "USAGE" | "ADJUSTMENT";

export interface WalletTransaction {
  id: string;
  membershipId: string;
  customerId: string;
  type: WalletTransactionType;
  amountAdded: number;
  amountUsed: number;
  previousBalance: number;
  newBalance: number;
  invoiceNumber?: string;
  billId?: string;
  notes?: string;
  date: string;
}

// ==================== APPOINTMENTS ====================

export interface Appointment {
  id: string;
  customerId: string;
  serviceId: string;
  employeeId: string;
  date: string; // ISO date
  time: string; // "HH:mm"
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string;
  billId?: string; // set once converted to a bill
  createdAt: string;
}

// ==================== BILLABLE ITEMS (jewelry / misc) ====================

export interface BillableItem {
  id: string;
  name: string;
  category: string;
  price: number;
  deposit?: number;
  status: RecordStatus;
}

// ==================== GST SETTINGS ====================

export interface GSTSettings {
  gstin: string;
  legalName: string;
  tradeName: string;
  address: string;
  state: string;
  stateCode: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  defaultGSTRatePercent: number;
  businessStateCode: string; // used to decide CGST/SGST vs IGST vs customer state
}

// ==================== BUSINESS SETTINGS ====================

export interface BusinessSettings {
  salonName: string;
  tagline: string;
  logoUrl?: string;
  phone: string;
  email: string;
  address: string;
  invoiceFooterNote?: string;
  currencySymbol: string;
}

// ==================== BILLING ====================

export interface BillLineItem {
  id: string;
  type: "SERVICE" | "ITEM"; // service or billable item (jewelry etc.)
  refId: string; // serviceId or billableItemId
  name: string;
  employeeId?: string;
  employeeName?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  gstRatePercent: number;
  durationMinutes?: number;
}

export interface Bill {
  id: string;
  invoiceNumber: string;
  date: string; // ISO datetime
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: BillLineItem[];
  subtotal: number;
  discountAmount: number;
  membershipId?: string;
  membershipDiscountAmount?: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGstAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  walletAmountUsed?: number;
  balanceDue: number;
  gstTaxType: GSTTaxType;
  createdByUserId: string;
  createdByName: string;
  status: "COMPLETED" | "VOID";
  notes?: string;
  appointmentId?: string;
}

// ==================== STAFF COMMISSION ====================

export type CommissionType = "PERCENTAGE" | "FIXED";
export type CommissionScope = "GLOBAL" | "EMPLOYEE" | "SERVICE" | "EMPLOYEE_SERVICE";
export type CommissionStatus = "Pending" | "Paid";

export interface CommissionRule {
  id: string;
  scope: CommissionScope;
  employeeId?: string; // required when scope is EMPLOYEE or EMPLOYEE_SERVICE
  serviceId?: string; // required when scope is SERVICE or EMPLOYEE_SERVICE
  type: CommissionType;
  value: number; // percent (0-100) or flat rupee amount per service performed
  status: RecordStatus;
  createdAt: string;
}

export interface CommissionRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  billId: string;
  invoiceNumber: string;
  serviceId: string;
  serviceName: string;
  date: string;
  saleAmount: number;
  commissionType: CommissionType;
  commissionValue: number;
  commissionAmount: number;
  status: CommissionStatus;
  paidDate?: string;
}

// ==================== INVENTORY ====================

export interface InventoryProduct {
  id: string;
  name: string;
  category: string;
  brand?: string;
  supplier?: string;
  quantity: number;
  unit: string; // e.g. "pcs", "ml", "ltr", "box"
  purchasePrice: number;
  minStockLevel: number;
  status: RecordStatus;
  createdAt: string;
}

export type StockTransactionType = "ADD" | "REMOVE" | "ADJUST";

export interface StockTransaction {
  id: string;
  productId: string;
  productName: string;
  type: StockTransactionType;
  quantityChange: number; // signed: positive for ADD, negative for REMOVE, +/- for ADJUST
  quantityAfter: number;
  reason?: string;
  date: string;
  performedByUserId: string;
  performedByName: string;
}

// ==================== EXPENSES ====================

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Electricity",
  "Salary",
  "Product Purchase",
  "Maintenance",
  "Internet",
  "Cleaning",
  "Equipment",
  "Marketing",
  "Other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpensePaymentMethod = "Cash" | "UPI" | "Card" | "Bank Transfer" | "Other";
export type ExpenseStatus = "Recorded" | "Void";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  paymentMethod: ExpensePaymentMethod;
  referenceNumber?: string;
  notes?: string;
  receiptUrl?: string;
  status: ExpenseStatus;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
}

// ==================== JEWELLERY RENTAL ====================

export type JewelleryItemStatus = "AVAILABLE" | "RESERVED" | "RENTED";
export type JewelleryRentalStatus = "RESERVED" | "RENTED" | "RETURNED" | "CANCELLED";
export type JewelleryReturnCondition = "GOOD" | "DAMAGED" | "LOST";

export interface JewelleryItem {
  id: string;
  name: string;
  category: string;
  photoUrl?: string;
  rentalPrice: number;
  securityDeposit: number;
  rentalDurationDays: number;
  status: JewelleryItemStatus;
  createdAt: string;
}

export interface JewelleryRental {
  id: string;
  jewelleryItemId: string;
  jewelleryItemName: string;
  customerId: string;
  customerName: string;
  employeeId?: string;
  employeeName?: string;
  rentalDate: string;
  expectedReturnDate: string;
  rentalAmount: number;
  securityDeposit: number;
  status: JewelleryRentalStatus;
  notes?: string;
  // populated on return
  actualReturnDate?: string;
  returnCondition?: JewelleryReturnCondition;
  damageCharges?: number;
  otherPenalty?: number;
  depositReturned?: number;
  finalRefundAmount?: number;
  returnNotes?: string;
  createdAt: string;
}

// ==================== REPORTS ====================

export type DateRangePreset =
  | "TODAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "THIS_YEAR"
  | "CUSTOM";

export interface DateRange {
  from: string; // ISO date
  to: string; // ISO date
}
