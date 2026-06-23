/* ================================================
   CHRIS ROYAL ELECTRONIC ENTERPRISE — script2.js
   ================================================ */

// ---- STATIC FALLBACK PRODUCTS (used only if Supabase is empty) ----
const staticProducts = [
  { id: 17, name: "Iphone 17 pro-max",           img: "images/iphone17.webp",          rating: 5, count: 888, badge: "New",  price: 0 },
  { id: 14, name: "Xiaomi 17 Ultra",              img: "images/xiaomi 17 Ultra.avif",   rating: 4, count: 198, badge: "Best", price: 0 },
  { id: 2,  name: "Samsung Galaxy S25 Ultra",     img: "images/samsungs25.jpg",         rating: 5, count: 98,  badge: "Hot",  price: 0 },
  { id: 15, name: "Tecno Spark 40",               img: "images/tecnospark40.avif",      rating: 5, count: 177, badge: "",     price: 0 },
  { id: 3,  name: "Apple AirPods Pro 2",          img: "images/apple earpods.webp",     rating: 5, count: 210, badge: "New",  price: 0 },
  { id: 4,  name: "Beats Studio Pro",             img: "images/beats pro.jpg",          rating: 4, count: 77,  badge: "",     price: 0 },
  { id: 5,  name: "iPhone 16 Plus",               img: "images/iphone16.jpg",           rating: 5, count: 143, badge: "New",  price: 0 },
  { id: 6,  name: "Sony WH-1000XM5",              img: "images/sony wh.jpg",            rating: 5, count: 89,  badge: "",     price: 0 },
  { id: 7,  name: "Samsung Galaxy Z Fold 6",      img: "images/sumsang fold6.jpg",      rating: 4, count: 55,  badge: "Hot",  price: 0 },
  { id: 8,  name: "Premium Leather Phone Case",   img: "images/premium leathercase.jpg",rating: 4, count: 312, badge: "",     price: 0 },
  { id: 9,  name: "JBL Tune Beam Earbuds",        img: "images/tunebeamearbuds.jpg",    rating: 4, count: 64,  badge: "New",  price: 0 },
  { id: 10, name: "Google Pixel 9 Pro",           img: "images/googlepxel9.jpg",        rating: 4, count: 47,  badge: "",     price: 0 },
  { id: 11, name: "MagSafe Clear Case – iPhone 17",img: "images/caseiphone17.jpg",      rating: 5, count: 188, badge: "New",  price: 0 },
  { id: 12, name: "Bose QuietComfort Ultra",      img: "images/boss quiet confort.jpg", rating: 5, count: 95,  badge: "Hot",  price: 0 },
  { id: 13, name: "OnePlus 13 5G",                img: "images/oneplus13.jpg",          rating: 4, count: 33,  badge: "",     price: 0 },
  { id: 18, name: "Content Gadget holding Tripods",img: "images/content holder.webp",   rating: 5, count: 98,  badge: "",     price: 0 },
];

// Track load-more state for static fallback
let staticProductsLoaded = false;

// ---- BUILD STARS ----
function buildStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += `<span class="star" style="${i <= rating ? '' : 'opacity:0.25'}">★</span>`;
  }
  return stars;
}

// ---- BUILD PRODUCT CARD ----
// Price is shown between stars and the Add to Cart button.
// If price is 0 or missing, the price line is hidden.
function buildProductCard(product) {
  const badgeHTML = product.badge ? `<div class="card-badge-new">${product.badge}</div>` : '';
  const priceHTML = (product.price && Number(product.price) > 0)
    ? `<div style="color:var(--orange);font-weight:700;font-size:0.97rem;margin:6px 0 8px;letter-spacing:0.01em;">UGX ${Number(product.price).toLocaleString('en-UG')}</div>`
    : '';

  return `
    <div class="product-card" data-id="${product.id}">
      <div class="card-img-wrap">
        <img src="${product.img}" alt="${product.name}" loading="lazy" />
        ${badgeHTML}
      </div>
      <div class="card-body">
        <h3 class="card-title">${product.name}</h3>
        <div class="card-rating">
          ${buildStars(product.rating)}
          <span class="rating-count">(${product.count})</span>
        </div>
        ${priceHTML}
        <button class="add-to-cart-btn"
          onclick="addToCart(this, ${product.id}, '${product.name.replace(/'/g,"\\'")}', '${product.img}', ${Number(product.price) || 0})">
          Add to Cart
        </button>
      </div>
    </div>
  `;
}

// ---- SUPABASE PRODUCT LOADING (primary) ----
async function loadSupabaseProducts() {
  const grid = document.getElementById('productGrid');
  const moreBtn = document.getElementById('moreBtn');

  try {
    const products = await fetchProducts(); // from supabase-client.js

    if (products && products.length > 0) {
      grid.innerHTML = '';
      products.forEach(p => {
        grid.insertAdjacentHTML('beforeend', buildProductCard(p));
      });

      // Hide "More Collection" button — all products are already shown
      if (moreBtn) moreBtn.style.display = 'none';

      // Live updates: re-render if admin adds/edits/deletes a product
      subscribeToProducts(async () => {
        const fresh = await fetchProducts();
        grid.innerHTML = '';
        fresh.forEach(p => grid.insertAdjacentHTML('beforeend', buildProductCard(p)));
      });

      return true;
    }
  } catch (err) {
    console.warn('Supabase product load failed, falling back to static:', err);
  }
  return false;
}

// ---- STATIC FALLBACK (used if Supabase is empty or fails) ----
function renderInitialProducts() {
  const grid = document.getElementById('productGrid');
  const initial = staticProducts.slice(0, 7);
  initial.forEach(p => {
    grid.insertAdjacentHTML('beforeend', buildProductCard(p));
  });
}

function loadMoreProducts() {
  if (staticProductsLoaded) return;
  staticProductsLoaded = true;
  const grid = document.getElementById('productGrid');
  const remaining = staticProducts.slice(7);
  remaining.forEach(p => {
    const card = document.createElement('div');
    card.innerHTML = buildProductCard(p).trim();
    const cardEl = card.firstElementChild;
    cardEl.style.opacity = '0';
    cardEl.style.transform = 'translateY(20px)';
    grid.appendChild(cardEl);
    setTimeout(() => {
      cardEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      cardEl.style.opacity = '1';
      cardEl.style.transform = 'translateY(0)';
    }, 30);
  });
  const btn = document.getElementById('moreBtn');
  btn.textContent = '✓ Full Collection Loaded';
  btn.style.opacity = '0.5';
  btn.style.cursor = 'default';
  btn.onclick = null;
}

// ── INTERSECTION OBSERVER — REVEAL ANIMATIONS ──
const revealTargets = document.querySelectorAll('.reveal-up, .reveal-right');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
revealTargets.forEach(el => revealObserver.observe(el));

// ── STAT COUNTERS ──
function animateCounter(el, target, duration = 1800) {
  const start = performance.now();
  const step = (timestamp) => {
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      animateCounter(el, parseInt(el.dataset.target));
      statObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num').forEach(el => statObserver.observe(el));

// ---- CART SYSTEM ----
function getCart() {
  return JSON.parse(localStorage.getItem('crCart') || '[]');
}
function saveCart(cart) {
  localStorage.setItem('crCart', JSON.stringify(cart));
  updateCartCount();
}
function updateCartCount() {
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + item.qty, 0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = total;
}

// price parameter added — stored in cart object for checkout totals
function addToCart(btn, id, name, img, price) {
  const cart = getCart();
  const existing = cart.find(i => i.id === id);
  const addedTime = new Date().toISOString();

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, name, img, price: Number(price) || 0, qty: 1, addedTime });
  }
  saveCart(cart);
  showAddedBadge(btn);
}

function showAddedBadge(btn) {
  const existing = btn.parentElement.querySelector('.added-badge');
  if (existing) existing.remove();

  const badge = document.createElement('span');
  badge.className = 'added-badge';
  badge.textContent = '✓ Added!';
  btn.parentElement.style.position = 'relative';
  btn.parentElement.appendChild(badge);

  setTimeout(() => {
    badge.classList.add('fade-out');
    setTimeout(() => badge.remove(), 450);
  }, 4000);
}

// ---- THEME TOGGLE ----
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

// ---- NAV HAMBURGER ----
function initHamburger() {
  const btn = document.getElementById('hamburger');
  const links = document.getElementById('navLinks');
  if (!btn || !links) return;
  btn.addEventListener('click', () => {
    links.classList.toggle('open');
    const spans = btn.querySelectorAll('span');
    if (links.classList.contains('open')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    }
  });
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      btn.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    });
  });
}

// ---- FAQ ACCORDION ----
function toggleFAQ(trigger) {
  const item = trigger.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

// ---- FORM VALIDATION ----
function handleFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('fname');
  const phone = document.getElementById('fphone');
  const message = document.getElementById('fmessage');
  const errorBox = document.getElementById('formError');

  let errors = [];
  let hasError = false;

  [name, phone, message].forEach(f => f.classList.remove('error'));
  errorBox.style.display = 'none';

  if (!name.value.trim()) { name.classList.add('error'); errors.push('Full Name is required.'); hasError = true; }
  if (!phone.value.trim()) { phone.classList.add('error'); errors.push('Phone Number is required.'); hasError = true; }
  if (!message.value.trim()) { message.classList.add('error'); errors.push('Message is required.'); hasError = true; }

  if (hasError) {
    errorBox.style.display = 'block';
    errorBox.textContent = '⚠ ' + errors.join(' ');
    playAlertSound();
    return;
  }

  showSuccessOverlay();
  setTimeout(() => { e.target.submit(); }, 500);
}

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

function showSuccessOverlay() {
  const overlay = document.getElementById('successOverlay');
  overlay.style.display = 'flex';
  setTimeout(() => closeSuccessOverlay(), 4000);
}

function closeSuccessOverlay() {
  const overlay = document.getElementById('successOverlay');
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.3s ease';
  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.style.opacity = '';
    overlay.style.transition = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('contactForm').reset();
  }, 300);
}

// ---- FOOTER YEAR ----
function setFooterYear() {
  const el = document.getElementById('footerYear');
  if (el) el.textContent = new Date().getFullYear();
}

// ---- NAVBAR SCROLL EFFECT ----
function initNavbarScroll() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      nav.style.boxShadow = '0 4px 24px rgba(255,107,0,0.15)';
    } else {
      nav.style.boxShadow = 'none';
    }
  }, { passive: true });
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initHamburger();
  initNavbarScroll();
  updateCartCount();
  setFooterYear();

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

  // Try Supabase first; use static products as fallback
  const loaded = await loadSupabaseProducts();
  if (!loaded) {
    renderInitialProducts();
  }
});