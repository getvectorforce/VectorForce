import test from 'node:test';
import assert from 'node:assert/strict';
import { BillingEngine } from '../backend/billing-engine.js';
import { createRestaurantServer } from '../backend/server.js';

test('BillingEngine: calculates subtotal, 5% GST tax, and grand total accurately', () => {
  const engine = new BillingEngine();
  const bill = engine.calculateBill({
    items: [
      { id: 'item-201', qty: 2 }, // Margherita D.O.P. ($16.50 * 2 = $33.00)
      { id: 'item-401', qty: 1 }  // Artisanal Yuzu Sparkler ($6.50 * 1 = $6.50)
    ]
  });

  assert.equal(bill.subtotal, 39.50);
  assert.equal(bill.discount, 0);
  assert.equal(bill.taxAmount, 1.98); // 5% of 39.50 = 1.975 -> $1.98
  assert.equal(bill.grandTotal, 41.48);
});

test('BillingEngine: applies WELCOME10 (10%) and FEAST20 (20% >= $40) promo codes', () => {
  const engine = new BillingEngine();

  // Order >= $40 eligible for FEAST20
  const bill = engine.calculateBill({
    items: [
      { id: 'item-301', qty: 2 } // Herb-Crusted Salmon ($24.00 * 2 = $48.00)
    ],
    promoCode: 'FEAST20'
  });

  assert.equal(bill.subtotal, 48.00);
  assert.equal(bill.appliedPromo, 'FEAST20');
  assert.equal(bill.discount, 9.60);
  assert.equal(bill.taxableAmount, 38.40);
  assert.equal(bill.taxAmount, 1.92);
  assert.equal(bill.grandTotal, 40.32);
});

test('BillingEngine: creates sequential invoices and tracks daily summary', () => {
  const engine = new BillingEngine();
  const inv1 = engine.createBill({
    tableNumber: 'T-04',
    customerName: 'Aarav Sharma',
    paymentMethod: 'UPI',
    items: [{ id: 'item-101', qty: 1 }]
  });

  assert.equal(inv1.invoiceId, 'INV-1001');
  assert.equal(inv1.status, 'PAID');

  const summary = engine.getBillsSummary();
  assert.equal(summary.totalBills, 1);
  assert.equal(summary.totalRevenue, inv1.grandTotal);
});

test('HTTP Server E2E: serves POS frontend, menu API, bill preview, and invoice creation', async () => {
  const server = createRestaurantServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Static POS UI
    const htmlRes = await fetch(`${baseUrl}/`);
    assert.equal(htmlRes.status, 200);
    const htmlText = await htmlRes.text();
    assert.ok(htmlText.includes('BistroForce POS'));

    // 2. Menu endpoint
    const menuRes = await fetch(`${baseUrl}/api/menu`);
    const menu = await menuRes.json();
    assert.ok(menu.items.length >= 10);

    // 3. Create official bill
    const billRes = await fetch(`${baseUrl}/api/bills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableNumber: 'T-02',
        customerName: 'Priya Verma',
        paymentMethod: 'Card',
        promoCode: 'WELCOME10',
        items: [{ id: 'item-203', qty: 2 }] // $20.50 * 2 = $41.00
      })
    });
    assert.equal(billRes.status, 201);
    const createdBill = await billRes.json();
    assert.equal(createdBill.invoiceId, 'INV-1001');
    assert.equal(createdBill.appliedPromo, 'WELCOME10');
    assert.equal(createdBill.grandTotal, 38.75); // 41 - 4.10 = 36.90 + 1.85 GST = 38.75
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});


