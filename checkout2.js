/* ================================================
   CHRIS ROYAL ELECTRONIC ENTERPRISE — checkout2.js
   Original WhatsApp flow preserved.
   Added: price totals in summary, Pay Online button
   with Supabase auth + Flutterwave payment.
   ================================================ */

const FLW_PUBLIC_KEY = "FLWPUBK_TEST-06e2c81ed175ce1de17cfd1a46bc1149-X";

// ---- Day.js Setup ----
function setupDayjs() {
  if (typeof dayjs !== 'undefined' && dayjs.extend) {
    if (typeof window.dayjs_plugin_utc !== 'undefined') {
      dayjs.extend(window.dayjs_plugin_utc);
    }
    if (typeof window.dayjs_plugin_timezone !== 'undefined') {
      dayjs.extend(window.dayjs_plugin_timezone);
    }
  }
}

function formatDate(isoString) {
  try {
    setupDayjs();
    let d;
    if (typeof dayjs !== 'undefined') {
      try {
        d = dayjs(isoString).utcOffset(3);
        return d.format('DD MMM YYYY');
      } catch(_) {}
    }
    const date = new Date(isoString);
    return date.toLocaleDateString('en-UG', { day:'2-digit', month:'short', year:'numeric', timeZone:'Africa/Nairobi' });
  } catch (_) {
    return new Date().toLocaleDateString('en-UG', { day:'2-digit', month:'short', year:'numeric' });
  }
}

function formatTime(isoString) {
  try {
    setupDayjs();
    if (typeof dayjs !== 'undefined') {
      try {
        const d = dayjs(isoString).utcOffset(3);
        return d.format('hh:mm A') + ' EAT';
      } catch(_) {}
    }
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-UG', { hour:'2-digit', minute:'2-digit', hour12:true, timeZone:'Africa/Nairobi' }) + ' EAT';
  } catch (_) {
    return new Date().toLocaleTimeString('en-UG', { hour:'2-digit', minute:'2-digit', hour12:true }) + ' EAT';
  }
}

// ---- Cart Utilities ----
function getCart() {
  return JSON.parse(localStorage.getItem('crCart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('crCart', JSON.stringify(cart));
}

// ---- Compute total price across all items ----
function computeCartTotal(cart) {
  return cart.reduce((sum, item) => sum + (Number(item.price) || 0) * item.qty, 0);
}

function formatPrice(n) {
  return Number(n || 0).toLocaleString('en-UG');
}

// ---- Render Cart ----
function renderCart() {
  const cart = getCart();
  const list = document.getElementById('cartItemsList');
  const emptyEl = document.getElementById('emptyCart');
  const titleEl = document.getElementById('checkoutTitle');
  const summaryUniqueEl = document.getElementById('summaryUniqueItems');
  const summaryTotalEl = document.getElementById('summaryTotalQty');
  const summaryPriceRow = document.getElementById('summaryPriceRow');
  const summaryTotalPrice = document.getElementById('summaryTotalPrice');

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const uniqueItems = cart.length;
  const totalPrice = computeCartTotal(cart);
  const hasPrice = cart.some(item => Number(item.price) > 0);

  // Update header counts
  if (titleEl) titleEl.textContent = `(Total Items: ${totalQty})`;
  if (summaryUniqueEl) summaryUniqueEl.textContent = uniqueItems;
  if (summaryTotalEl) summaryTotalEl.textContent = totalQty;

  // Show price total only if items have prices set
  if (summaryPriceRow) summaryPriceRow.style.display = hasPrice ? 'flex' : 'none';
  if (summaryTotalPrice) summaryTotalPrice.textContent = `UGX ${formatPrice(totalPrice)}`;

  list.innerHTML = '';

  if (cart.length === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  cart.forEach(item => {
    const dateStr = formatDate(item.addedTime || new Date().toISOString());
    const timeStr = formatTime(item.addedTime || new Date().toISOString());
    const itemPrice = Number(item.price) || 0;
    const itemTotal = itemPrice * item.qty;

    const card = document.createElement('div');
    card.className = 'cart-item';
    card.setAttribute('data-id', item.id);
    card.innerHTML = `
      <div class="cart-item-meta">
        <span class="meta-date">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
          Added: ${dateStr}
        </span>
        <span class="meta-time">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
          ${timeStr}
        </span>
      </div>
      <div class="cart-item-body">
        <div class="cart-item-img">
          <img src="${item.img}" alt="${item.name}" loading="lazy" />
        </div>
        <div class="cart-item-info">
          <h3>${item.name}</h3>
          <div class="qty-row">
            <span class="qty-label">Quantity:</span>
            <span class="qty-badge">${item.qty}</span>
          </div>
          ${itemPrice > 0 ? `
          <div class="qty-row" style="margin-top:6px;">
            <span class="qty-label">Unit Price:</span>
            <span style="color:var(--orange);font-weight:700;font-size:0.88rem;margin-left:6px;">UGX ${formatPrice(itemPrice)}</span>
          </div>
          <div class="qty-row" style="margin-top:4px;">
            <span class="qty-label">Subtotal:</span>
            <span style="color:var(--orange);font-weight:800;font-size:0.95rem;margin-left:6px;">UGX ${formatPrice(itemTotal)}</span>
          </div>` : ''}
        </div>
        <div class="cart-item-actions">
          <button class="delete-btn" onclick="deleteItem(${item.id})">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            Delete
          </button>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}

// ---- Delete Item ----
function deleteItem(id) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== id);
  saveCart(cart);

  const card = document.querySelector(`.cart-item[data-id="${id}"]`);
  if (card) {
    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'translateX(-16px)';
    setTimeout(() => {
      card.remove();
      renderCart();
    }, 300);
  } else {
    renderCart();
  }
}

// ---- Place Order via WhatsApp (original flow, untouched) ----
function placeOrder() {
  const cart = getCart();

  if (cart.length === 0) {
    alert('Your cart is empty! Add some products first.');
    return;
  }

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = computeCartTotal(cart);
  const hasPrice = cart.some(item => Number(item.price) > 0);

  let orderText = '🛒 *NEW ORDER — Chris Royal Electronic Enterprise*\n';
  orderText += '━━━━━━━━━━━━━━━━━━━━━━\n\n';
  orderText += '*ORDER ITEMS:*\n';

  cart.forEach((item, idx) => {
    orderText += `${idx + 1}. ${item.name}\n`;
    orderText += `   └ Quantity: *${item.qty} unit${item.qty > 1 ? 's' : ''}*\n`;
    if (Number(item.price) > 0) {
      orderText += `   └ Unit Price: UGX ${formatPrice(item.price)}\n`;
      orderText += `   └ Subtotal: UGX ${formatPrice(Number(item.price) * item.qty)}\n`;
    }
  });

  orderText += '\n━━━━━━━━━━━━━━━━━━━━━━\n';
  orderText += `📦 *Total Unique Products:* ${cart.length}\n`;
  orderText += `🔢 *Grand Total Units:* ${totalQty}\n`;
  if (hasPrice) {
    orderText += `💰 *Total Price:* UGX ${formatPrice(totalPrice)}\n`;
  }
  orderText += '\n━━━━━━━━━━━━━━━━━━━━━━\n';
  orderText += '📍 *Chris Royal Electronic Enterprise*\n';
  orderText += '📌 Mbarara, Uganda\n';
  orderText += '⏰ ' + formatTime(new Date().toISOString()) + '\n\n';
  orderText += '_Please confirm availability and provide payment details._';

  const encodedText = encodeURIComponent(orderText);
  window.open(`https://wa.me/256200904037?text=${encodedText}`, '_blank');
}

// ================================================================
// PAY ONLINE FLOW
// ================================================================

function initiateOnlinePayment() {
  const cart = getCart();
  if (cart.length === 0) {
    alert('Your cart is empty! Add some products first.');
    return;
  }
  const total = computeCartTotal(cart);
  if (total <= 0) {
    alert('These items do not have prices set yet. Please use the WhatsApp order button or contact us directly.');
    return;
  }
  openContactModal();
}

// ---- Step 1: Contact Verification Modal ----
function openContactModal() {
  const root = document.getElementById('crModalRoot');
  root.innerHTML = `
    <div id="crOverlay" style="position:fixed;inset:0;background:rgba(10,10,10,0.6);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
      <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);backdrop-filter:blur(20px);box-shadow:var(--shadow-md);padding:28px;width:100%;max-width:400px;">
        <h3 style="font-family:var(--font-display);font-weight:800;margin-bottom:6px;color:var(--text-dark);">Confirm Your Details</h3>
        <p style="color:var(--text-mid);font-size:0.88rem;margin-bottom:20px;">We need this to process your payment and order.</p>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:6px;color:var(--text-dark);">Full Name</label>
          <input id="crName" type="text" placeholder="e.g. John Tumusiime"
            style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--card-border);background:var(--white);font-size:0.95rem;font-family:inherit;color:var(--text-dark);" />
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:6px;color:var(--text-dark);">Email Address</label>
          <input id="crEmail" type="email" placeholder="e.g. you@email.com"
            style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--card-border);background:var(--white);font-size:0.95rem;font-family:inherit;color:var(--text-dark);" />
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:6px;color:var(--text-dark);">Phone Number</label>
          <input id="crPhone" type="tel" placeholder="e.g. 07XXXXXXXX"
            style="width:100%;padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--card-border);background:var(--white);font-size:0.95rem;font-family:inherit;color:var(--text-dark);" />
        </div>
        <div id="crModalError" style="color:#D32F2F;font-size:0.82rem;min-height:1.2em;margin-bottom:8px;"></div>
        <div style="display:flex;gap:10px;margin-top:8px;">
          <button id="crCancelBtn"
            style="flex:1;padding:13px;border-radius:var(--radius-sm);background:transparent;border:1.5px solid var(--card-border);color:var(--text-mid);font-weight:700;font-size:0.92rem;font-family:inherit;cursor:pointer;">
            Cancel
          </button>
          <button id="crConfirmBtn"
            style="flex:1;padding:13px;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--orange),#FF8C00);color:#fff;font-weight:700;font-size:0.92rem;font-family:inherit;cursor:pointer;border:none;box-shadow:0 4px 20px rgba(255,107,0,0.35);">
            Continue to Pay
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('crCancelBtn').addEventListener('click', closeModal);
  document.getElementById('crConfirmBtn').addEventListener('click', handleContactSubmit);
}

function closeModal() {
  const root = document.getElementById('crModalRoot');
  if (root) root.innerHTML = '';
}

async function handleContactSubmit() {
  const name  = document.getElementById('crName').value.trim();
  const email = document.getElementById('crEmail').value.trim();
  const phone = document.getElementById('crPhone').value.trim();
  const errorEl = document.getElementById('crModalError');
  const confirmBtn = document.getElementById('crConfirmBtn');

  if (!name || !email || !phone) {
    errorEl.textContent = 'Please fill in all fields.'; return;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    errorEl.textContent = 'Please enter a valid email address.'; return;
  }
  if (phone.replace(/\D/g, '').length < 9) {
    errorEl.textContent = 'Please enter a valid phone number.'; return;
  }

  errorEl.textContent = '';
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Verifying…';

  try {
    const user = await authenticateCustomer({ name, email, phone });
    closeModal();
    triggerFlutterwave({ userId: user.id, name, email, phone });
  } catch (err) {
    errorEl.textContent = err.message || 'Could not verify your details. Please try again.';
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Continue to Pay';
  }
}

// ---- Step 2: Flutterwave Checkout ----
function triggerFlutterwave({ userId, name, email, phone }) {
  const cart = getCart();
  const total = computeCartTotal(cart);
  const txRef = 'CR-' + Date.now();

  if (typeof FlutterwaveCheckout !== 'function') {
    alert('Payment service failed to load. Please check your connection and try again.');
    return;
  }

  FlutterwaveCheckout({
    public_key: FLW_PUBLIC_KEY,
    tx_ref: txRef,
    amount: total,
    currency: 'UGX',
    payment_options: 'card, mobilemoneyuganda',
    customer: { email, phone_number: phone, name: name },
    meta: [
      { metaname: 'Merchant', metavalue: 'Chris Royal Electronic Enterprise' },
      { metaname: 'Location', metavalue: 'Mbarara, Uganda' },
    ],
    customizations: {
      title: 'Chris Royal Electronic Enterprise',
      description: 'Premium-Electronic - Mbarara- Uganda',
    },
   /* callback: async function (data) {
      if (data.status === 'successful' || data.status === 'completed') {
        try {
          await createOrder({
            profileId: userId,
            name, email, phone,
            items: cart,
            total,
            flutterwaveRef: data.transaction_id ? String(data.transaction_id) : txRef,
            status: 'Successful',
          });
          localStorage.removeItem('crCart');
          showPaymentSuccess();
        } catch (err) {
          alert(
            'Payment succeeded but we could not save your order (' +
            (err.message || 'unknown error') +
            '). Please contact us via WhatsApp with reference: ' + txRef
          );
        }
      } else {
        alert('Payment was not completed. Please try again.');
      }
    },*/
   
    callback: async function (data) {
      if (!data.transaction_id) {
        alert('Payment was not completed. Please try again.');
        return;
      }
      try {
        const res = await fetch(
          'https://fxbxnuzjkvpmszhzjdhk.supabase.co/functions/v1/verify-payment',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction_id: data.transaction_id,
              tx_ref: txRef,
              profile_id: userId,
              customer_name: name,
              customer_email: email,
              customer_phone: phone,
              items: cart,
              expected_total: total,
            }),
          }
        );
        const result = await res.json();
        if (result.verified) {
          localStorage.removeItem('crCart');
          showPaymentSuccess();
        } else {
          alert(
            'We could not verify your payment. If money was deducted, contact us via WhatsApp with reference: ' + txRef
          );
        }
      } catch (err) {
        alert(
          'Could not confirm payment due to a connection issue. Contact us via WhatsApp with reference: ' + txRef
        );
      }
    },
   
    onclose: function () {},
  });
}

// ---- Step 3: Success Overlay ----
function showPaymentSuccess() {
  const root = document.getElementById('crModalRoot');
  root.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(10,10,10,0.7);backdrop-filter:blur(10px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
      <div style="background:var(--white);border-radius:24px;padding:48px 40px;text-align:center;max-width:400px;width:100%;box-shadow:0 30px 80px rgba(0,0,0,0.3);">
        <div style="font-size:3.5rem;margin-bottom:16px;">✅</div>
        <h2 style="font-family:var(--font-display);font-size:1.6rem;font-weight:800;color:var(--text-dark);margin-bottom:12px;">Order Confirmed!</h2>
        <p style="color:var(--text-mid);font-size:0.93rem;line-height:1.6;margin-bottom:28px;">
          Thank you for shopping with Chris Royal Electronic Enterprise.<br>We'll reach out shortly to confirm delivery.
        </p>
        <a href="index.html"
          style="display:inline-flex;align-items:center;gap:8px;padding:13px 28px;background:linear-gradient(135deg,var(--orange),#FF8C00);color:#fff;border-radius:50px;font-weight:700;font-size:0.95rem;text-decoration:none;box-shadow:0 4px 20px rgba(255,107,0,0.4);">
          Continue Shopping
        </a>
      </div>
    </div>
  `;
}

// ================================================================
// THEME / FOOTER (original — unchanged)
// ================================================================
function initTheme() {
  const saved = localStorage.getItem('crTheme') || 'light';
  document.body.className = saved === 'dark' ? 'dark-mode' : 'light-mode';
  updateThemeLabel();
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark-mode');
  document.body.className = isDark ? 'light-mode' : 'dark-mode';
  localStorage.setItem('crTheme', isDark ? 'light' : 'dark');
  updateThemeLabel();
}

function updateThemeLabel() {
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = document.body.classList.contains('dark-mode') ? '🌙' : '☀️';
}

function setFooterYear() {
  const el = document.getElementById('footerYear');
  if (el) el.textContent = new Date().getFullYear();
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setFooterYear();

  const tt = document.getElementById('themeToggle');
  if (tt) tt.addEventListener('click', toggleTheme);

  setTimeout(() => {
    setupDayjs();
    renderCart();
  }, 200);
});