/**
 * BistroForce POS — Interactive Restaurant Ordering & Billing Frontend
 *
 * Architectural Decisions (Tracked in VectorForce):
 * - DEC-POS-01: Server-authoritative bill preview via POST /api/bills/preview (never duplicate rounding math in browser).
 * - DEC-POS-02: Thermal-style receipt modal (`INV-1001`) + live daily KPI strip refresh.
 */

const state = {
  categories: [],
  menuItems: [],
  selectedCategory: 'All',
  vegOnly: false,
  cart: new Map(), // itemId -> qty
  promoCode: '',
  paymentMethod: 'Card',
  lastBreakdown: null
};

const els = {
  categoryTabs: document.getElementById('category-tabs'),
  vegCheckbox: document.getElementById('veg-only-checkbox'),
  menuGrid: document.getElementById('menu-grid'),
  cartItems: document.getElementById('cart-items'),
  clearCartBtn: document.getElementById('clear-cart-btn'),
  tableSelect: document.getElementById('table-select'),
  customerInput: document.getElementById('customer-input'),
  promoInput: document.getElementById('promo-input'),
  applyPromoBtn: document.getElementById('apply-promo-btn'),
  promoFeedback: document.getElementById('promo-feedback'),
  summaryCount: document.getElementById('summary-count'),
  summarySubtotal: document.getElementById('summary-subtotal'),
  summaryDiscount: document.getElementById('summary-discount'),
  summaryTaxable: document.getElementById('summary-taxable'),
  summaryTax: document.getElementById('summary-tax'),
  summaryGrand: document.getElementById('summary-grand'),
  checkoutBtn: document.getElementById('checkout-btn'),
  invoicesList: document.getElementById('invoices-list'),
  kpiRevenue: document.getElementById('kpi-revenue'),
  kpiBills: document.getElementById('kpi-bills'),
  kpiTax: document.getElementById('kpi-tax'),
  receiptModal: document.getElementById('receipt-modal'),
  receiptMeta: document.getElementById('receipt-meta'),
  receiptBody: document.getElementById('receipt-body'),
  printReceiptBtn: document.getElementById('print-receipt-btn'),
  closeReceiptBtn: document.getElementById('close-receipt-btn')
};

function fmt(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

async function initPos() {
  const res = await fetch('/api/menu');
  const data = await res.json();
  state.categories = data.categories || [];
  state.menuItems = data.items || [];

  renderCategories();
  renderMenu();
  await refreshLedger();
}

function renderCategories() {
  els.categoryTabs.innerHTML = state.categories
    .map(
      (cat) => `
      <button type="button" class="cat-tab ${cat === state.selectedCategory ? 'active' : ''}" data-cat="${cat}">
        ${cat}
      </button>`
    )
    .join('');

  els.categoryTabs.querySelectorAll('.cat-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedCategory = btn.dataset.cat;
      renderCategories();
      renderMenu();
    });
  });
}

function renderMenu() {
  const filtered = state.menuItems.filter((item) => {
    if (state.selectedCategory !== 'All' && item.category !== state.selectedCategory) return false;
    if (state.vegOnly && !item.isVeg) return false;
    return true;
  });

  els.menuGrid.innerHTML = filtered
    .map(
      (item) => `
      <article class="menu-card">
        <div>
          <div class="card-top">
            <span class="diet-dot ${item.isVeg ? 'diet-veg' : 'diet-nonveg'}">
              ${item.isVeg ? '● VEG' : '▲ NON-VEG'}
            </span>
            <span class="item-badge">${item.badge}</span>
          </div>
          <h3>${item.name}</h3>
          <p>${item.description}</p>
        </div>
        <div class="card-bottom">
          <span class="price-tag">${fmt(item.price)}</span>
          <button type="button" class="btn-add" data-id="${item.id}">+ Add to Bill</button>
        </div>
      </article>`
    )
    .join('');

  els.menuGrid.querySelectorAll('.btn-add').forEach((btn) => {
    btn.addEventListener('click', () => updateQty(btn.dataset.id, 1));
  });
}

async function updateQty(itemId, delta) {
  const current = state.cart.get(itemId) || 0;
  const next = current + delta;
  if (next <= 0) {
    state.cart.delete(itemId);
  } else {
    state.cart.set(itemId, next);
  }
  await refreshBillPreview();
}

function getCartPayload() {
  return Array.from(state.cart.entries()).map(([id, qty]) => ({ id, qty }));
}

async function refreshBillPreview() {
  const items = getCartPayload();
  if (items.length === 0) {
    state.lastBreakdown = null;
    els.cartItems.innerHTML = '<p class="empty-cart">Select dishes from the menu to start billing.</p>';
    els.summaryCount.textContent = '0';
    els.summarySubtotal.textContent = '$0.00';
    els.summaryDiscount.textContent = '-$0.00';
    els.summaryTaxable.textContent = '$0.00';
    els.summaryTax.textContent = '$0.00';
    els.summaryGrand.textContent = '$0.00';
    els.promoFeedback.textContent = '';
    els.checkoutBtn.disabled = true;
    return;
  }

  const res = await fetch('/api/bills/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, promoCode: state.promoCode })
  });
  const breakdown = await res.json();
  state.lastBreakdown = breakdown;

  els.cartItems.innerHTML = breakdown.lineItems
    .map(
      (line) => `
      <div class="cart-row">
        <div class="cart-row-title">
          <strong>${line.name}</strong>
          <span>${fmt(line.unitPrice)} × ${line.qty} = ${fmt(line.lineTotal)}</span>
        </div>
        <div class="qty-controls">
          <button type="button" class="qty-btn" data-id="${line.id}" data-delta="-1">−</button>
          <span>${line.qty}</span>
          <button type="button" class="qty-btn" data-id="${line.id}" data-delta="1">+</button>
        </div>
      </div>`
    )
    .join('');

  els.cartItems.querySelectorAll('.qty-btn').forEach((btn) => {
    btn.addEventListener('click', () => updateQty(btn.dataset.id, Number(btn.dataset.delta)));
  });

  els.summaryCount.textContent = String(breakdown.itemCount);
  els.summarySubtotal.textContent = fmt(breakdown.subtotal);
  els.summaryDiscount.textContent = `-${fmt(breakdown.discount)}`;
  els.summaryTaxable.textContent = fmt(breakdown.taxableAmount);
  els.summaryTax.textContent = fmt(breakdown.taxAmount);
  els.summaryGrand.textContent = fmt(breakdown.grandTotal);
  els.promoFeedback.textContent = breakdown.promoMessage || '';
  els.checkoutBtn.disabled = false;
}

async function refreshLedger() {
  const res = await fetch('/api/bills');
  const summary = await res.json();

  els.kpiRevenue.textContent = fmt(summary.totalRevenue);
  els.kpiBills.textContent = String(summary.totalBills);
  els.kpiTax.textContent = fmt(summary.totalTaxCollected);

  if (!summary.bills || summary.bills.length === 0) {
    els.invoicesList.innerHTML =
      '<p class="empty-state">No invoices generated yet. Add items on the right to issue your first bill.</p>';
    return;
  }

  els.invoicesList.innerHTML = summary.bills
    .map(
      (b) => `
      <div class="invoice-item">
        <div>
          <strong>${b.invoiceId}</strong> · ${b.tableNumber} (${b.customerName})
          <div class="subtext">${b.itemCount} items · ${b.paymentMethod} · ${
        b.appliedPromo ? `Promo ${b.appliedPromo}` : 'No Promo'
      }</div>
        </div>
        <strong>${fmt(b.grandTotal)}</strong>
      </div>`
    )
    .join('');
}

function showReceiptModal(bill) {
  els.receiptMeta.innerHTML = `
    <div>Invoice: <strong>${bill.invoiceId}</strong> | Table: <strong>${bill.tableNumber}</strong></div>
    <div>Guest: ${bill.customerName} | Paid via: ${bill.paymentMethod}</div>
  `;

  const linesHtml = bill.lineItems
    .map(
      (item) => `
      <div class="receipt-line">
        <span>${item.qty}x ${item.name}</span>
        <span>${fmt(item.lineTotal)}</span>
      </div>`
    )
    .join('');

  els.receiptBody.innerHTML = `
    ${linesHtml}
    <div class="receipt-line" style="margin-top:0.5rem;">
      <span>Subtotal</span>
      <span>${fmt(bill.subtotal)}</span>
    </div>
    <div class="receipt-line">
      <span>Discount ${bill.appliedPromo ? `(${bill.appliedPromo})` : ''}</span>
      <span>-${fmt(bill.discount)}</span>
    </div>
    <div class="receipt-line">
      <span>GST (${bill.taxRatePercent}%)</span>
      <span>${fmt(bill.taxAmount)}</span>
    </div>
    <div class="receipt-line receipt-total">
      <span>GRAND TOTAL</span>
      <span>${fmt(bill.grandTotal)}</span>
    </div>
  `;

  els.receiptModal.classList.remove('hidden');
}

// Event Listeners
els.vegCheckbox.addEventListener('change', () => {
  state.vegOnly = els.vegCheckbox.checked;
  renderMenu();
});

els.clearCartBtn.addEventListener('click', async () => {
  state.cart.clear();
  state.promoCode = '';
  els.promoInput.value = '';
  await refreshBillPreview();
});

els.applyPromoBtn.addEventListener('click', async () => {
  state.promoCode = els.promoInput.value.trim().toUpperCase();
  await refreshBillPreview();
});

document.querySelectorAll('.promo-chip').forEach((chip) => {
  chip.addEventListener('click', async () => {
    els.promoInput.value = chip.dataset.code;
    state.promoCode = chip.dataset.code;
    await refreshBillPreview();
  });
});

document.querySelectorAll('.pay-mode').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pay-mode').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.paymentMethod = btn.dataset.mode;
  });
});

els.checkoutBtn.addEventListener('click', async () => {
  const items = getCartPayload();
  if (items.length === 0) return;

  const res = await fetch('/api/bills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tableNumber: els.tableSelect.value,
      customerName: els.customerInput.value,
      items,
      promoCode: state.promoCode,
      paymentMethod: state.paymentMethod
    })
  });
  const bill = await res.json();
  showReceiptModal(bill);

  state.cart.clear();
  state.promoCode = '';
  els.promoInput.value = '';
  await refreshBillPreview();
  await refreshLedger();
});

els.printReceiptBtn.addEventListener('click', () => window.print());
els.closeReceiptBtn.addEventListener('click', () => els.receiptModal.classList.add('hidden'));

initPos();
