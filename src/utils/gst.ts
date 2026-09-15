import type { BillLineItem, GSTTaxType } from "@/types";
import { roundMoney } from "./currency";

export interface BillTotals {
  subtotal: number;
  lineDiscountTotal: number;
  additionalDiscountTotal: number;
  discountAmount: number; // total of all discounts (line + additional)
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGstAmount: number;
  grandTotal: number;
}

/**
 * Computes bill totals with GST applied per line item at that service's configured
 * rate. Any additional (manual/membership) discount is allocated proportionally
 * across lines before tax so the effective rate per service stays correct.
 */
export function calculateBillTotals(
  items: BillLineItem[],
  additionalDiscountTotal: number,
  gstTaxType: GSTTaxType
): BillTotals {
  const subtotal = roundMoney(
    items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  );
  const lineDiscountTotal = roundMoney(
    items.reduce((sum, i) => sum + i.discountAmount, 0)
  );
  const preTaxableSubtotal = Math.max(0, subtotal - lineDiscountTotal);
  const cappedAdditionalDiscount = Math.min(
    additionalDiscountTotal,
    preTaxableSubtotal
  );

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let taxableAmount = 0;

  items.forEach((item) => {
    const lineGross = item.unitPrice * item.quantity - item.discountAmount;
    if (lineGross <= 0) return;
    const shareOfAdditionalDiscount =
      preTaxableSubtotal > 0
        ? (lineGross / preTaxableSubtotal) * cappedAdditionalDiscount
        : 0;
    const lineTaxable = Math.max(0, lineGross - shareOfAdditionalDiscount);
    const lineGst = (lineTaxable * item.gstRatePercent) / 100;

    taxableAmount += lineTaxable;
    if (gstTaxType === "INTRA_STATE") {
      cgstAmount += lineGst / 2;
      sgstAmount += lineGst / 2;
    } else {
      igstAmount += lineGst;
    }
  });

  taxableAmount = roundMoney(taxableAmount);
  cgstAmount = roundMoney(cgstAmount);
  sgstAmount = roundMoney(sgstAmount);
  igstAmount = roundMoney(igstAmount);
  const totalGstAmount = roundMoney(cgstAmount + sgstAmount + igstAmount);
  const discountAmount = roundMoney(lineDiscountTotal + cappedAdditionalDiscount);
  const grandTotal = roundMoney(taxableAmount + totalGstAmount);

  return {
    subtotal,
    lineDiscountTotal,
    additionalDiscountTotal: cappedAdditionalDiscount,
    discountAmount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalGstAmount,
    grandTotal,
  };
}
