/**
 * Pure, Deterministic Restaurant Billing Engine
 *
 * Architectural Decisions (Tracked in VectorForce):
 * - DEC-BILL-01: In-memory order/bill store (zero external DB dependencies).
 * - DEC-BILL-02: Integer-cent arithmetic to prevent IEEE-754 floating-point rounding drift.
 * - DEC-BILL-03: 5% GST applied after promotional discounts.
 */

import { MENU_ITEMS, PROMO_CODES } from './menu-data.js';

export const TAX_RATE_PERCENT = 5; // 5% Restaurant GST

const menuById = new Map(MENU_ITEMS.map((item) => [item.id, item]));

function toCents(dollars) {
  return Math.round(Number(dollars) * 100);
}

function toDollars(cents) {
  return Number((cents / 100).toFixed(2));
}

export class BillingEngine {
  constructor() {
    this.bills = [];
    this.nextInvoiceSeq = 1001;
  }

  /**
   * Calculate itemized bill breakdown without persisting.
   * @param {{ items: Array<{ id: string, qty: number }>, promoCode?: string }} payload
   */
  calculateBill({ items = [], promoCode = '' } = {}) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Order must contain at least one menu item.');
    }

    const lineItems = [];
    let subtotalCents = 0;

    for (const entry of items) {
      const qty = Math.floor(Number(entry.qty || 0));
      if (qty <= 0) continue;

      const menuItem = menuById.get(entry.id);
      if (!menuItem) {
        throw new Error(`Unknown menu item ID: ${entry.id}`);
      }

      const unitPriceCents = toCents(menuItem.price);
      const lineTotalCents = unitPriceCents * qty;
      subtotalCents += lineTotalCents;

      lineItems.push({
        id: menuItem.id,
        name: menuItem.name,
        category: menuItem.category,
        unitPrice: toDollars(unitPriceCents),
        qty,
        lineTotal: toDollars(lineTotalCents)
      });
    }

    if (lineItems.length === 0) {
      throw new Error('Order must contain at least one item with quantity > 0.');
    }

    // Promo discount evaluation
    const normalizedPromo = String(promoCode || '').trim().toUpperCase();
    let discountCents = 0;
    let appliedPromo = null;
    let promoMessage = null;

    if (normalizedPromo) {
      const rule = PROMO_CODES[normalizedPromo];
      if (!rule) {
        promoMessage = `Invalid promo code "${normalizedPromo}"`;
      } else if (subtotalCents < toCents(rule.minSubtotal)) {
        promoMessage = `Promo "${normalizedPromo}" requires a minimum subtotal of $${rule.minSubtotal.toFixed(2)}`;
      } else {
        appliedPromo = rule.code;
        promoMessage = rule.description;
        if (rule.type === 'percent') {
          discountCents = Math.round((subtotalCents * rule.value) / 100);
        } else {
          discountCents = Math.min(subtotalCents, toCents(rule.value));
        }
      }
    }

    const taxableCents = Math.max(0, subtotalCents - discountCents);
    const taxAmountCents = Math.round((taxableCents * TAX_RATE_PERCENT) / 100);
    const grandTotalCents = taxableCents + taxAmountCents;

    return {
      lineItems,
      itemCount: lineItems.reduce((acc, item) => acc + item.qty, 0),
      subtotal: toDollars(subtotalCents),
      appliedPromo,
      promoMessage,
      discount: toDollars(discountCents),
      taxableAmount: toDollars(taxableCents),
      taxRatePercent: TAX_RATE_PERCENT,
      taxAmount: toDollars(taxAmountCents),
      grandTotal: toDollars(grandTotalCents)
    };
  }

  /**
   * Create and store an official restaurant bill / invoice.
   */
  createBill({
    tableNumber = 'T-01',
    customerName = 'Walk-in Guest',
    items = [],
    promoCode = '',
    paymentMethod = 'Card'
  } = {}) {
    const breakdown = this.calculateBill({ items, promoCode });
    const invoiceId = `INV-${this.nextInvoiceSeq++}`;

    const bill = {
      invoiceId,
      tableNumber: String(tableNumber || 'T-01').trim(),
      customerName: String(customerName || 'Walk-in Guest').trim(),
      paymentMethod: String(paymentMethod || 'Card').trim(),
      status: 'PAID',
      createdAt: new Date().toISOString(),
      ...breakdown
    };

    this.bills.unshift(bill);
    return bill;
  }

  /**
   * Return all bills and aggregated revenue metrics.
   */
  getBillsSummary() {
    const totalRevenueCents = this.bills.reduce((sum, b) => sum + toCents(b.grandTotal), 0);
    const totalTaxCents = this.bills.reduce((sum, b) => sum + toCents(b.taxAmount), 0);
    const totalDiscountCents = this.bills.reduce((sum, b) => sum + toCents(b.discount), 0);

    return {
      totalBills: this.bills.length,
      totalRevenue: toDollars(totalRevenueCents),
      totalTaxCollected: toDollars(totalTaxCents),
      totalDiscountsGiven: toDollars(totalDiscountCents),
      bills: this.bills
    };
  }
}

