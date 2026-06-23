/* ================================================
   CHRIS ROYAL ELECTRONIC ENTERPRISE — admin.js
   ================================================ */

// ---------------------------------------------------
// AUTH GATE
// ---------------------------------------------------
async function checkAdminAccess() {
  const profile = await getCurrentProfile();
  if (profile && profile.is_admin) {
    showAdminApp();
    return true;
  }
  return false;
}

function showAdminApp() {
  document.getElementById("authGate").style.display = "none";
  document.getElementById("adminApp").style.display = "block";
  loadCatalog();
  loadOrders();
}

async function handleAdminSignIn() {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  const errorEl = document.getElementById("authError");
  const btn = document.getElementById("authSubmit");

  if (!email || !password) {
    errorEl.textContent = "Enter email and password.";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Signing in…";

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    errorEl.textContent = error.message;
    btn.disabled = false;
    btn.textContent = "Sign In";
    return;
  }

  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    errorEl.textContent = "This account does not have admin access.";
    await supabaseClient.auth.signOut();
    btn.disabled = false;
    btn.textContent = "Sign In";
  }
}

async function handleSignOut() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}

// ---------------------------------------------------
// TABS
// ---------------------------------------------------
function initTabs() {
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.tab;
      document.getElementById("tab-catalog").style.display = target === "catalog" ? "block" : "none";
      document.getElementById("tab-orders").style.display = target === "orders" ? "block" : "none";
    });
  });
}

// ---------------------------------------------------
// CATALOG
// ---------------------------------------------------
async function loadCatalog() {
  const products = await fetchProducts();
  renderCatalog(products);
}

function renderCatalog(products) {
  const wrap = document.getElementById("catalogTable");
  const header = `
    <div class="table-row header-row">
      <span>Image</span><span>Name</span><span>Price</span><span>Rating</span><span>Badge</span><span>Actions</span>
    </div>`;

  if (!products || products.length === 0) {
    wrap.innerHTML = header + `<p style="padding:20px;color:var(--text-mid);">No products yet. Add your first one.</p>`;
    return;
  }

  wrap.innerHTML = header + products
    .map(
      (p) => `
    <div class="table-row" data-id="${p.id}">
      <img src="${p.img}" alt="" />
      <span>${escapeHtmlA(p.name)}</span>
      <span>UGX ${Number(p.price).toLocaleString("en-UG")}</span>
      <span>${p.rating}★ (${p.count})</span>
      <span>${escapeHtmlA(p.badge || "—")}</span>
      <div class="row-actions">
        <button class="btn-edit" data-id="${p.id}">Edit</button>
        <button class="btn-delete" data-id="${p.id}">Delete</button>
      </div>
    </div>`
    )
    .join("");

  wrap.querySelectorAll(".btn-edit").forEach((btn) =>
    btn.addEventListener("click", () => openProductModal(products.find((p) => p.id === Number(btn.dataset.id))))
  );
  wrap.querySelectorAll(".btn-delete").forEach((btn) =>
    btn.addEventListener("click", () => deleteProduct(Number(btn.dataset.id)))
  );
}

function escapeHtmlA(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function openProductModal(product) {
  const isEdit = !!product;
  const root = document.getElementById("modalRoot");
  root.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-card">
        <h3>${isEdit ? "Edit Product" : "Add Product"}</h3>
        <div class="modal-field"><label>Name</label><input id="pName" value="${isEdit ? escapeHtmlA(product.name) : ""}" /></div>
        <div class="modal-field">
  <label>Product Image</label>
  <input type="file" id="pImgFile" accept="image/*" />
  <input type="hidden" id="pImg" value="${isEdit ? escapeHtmlA(product.img) : ""}" />
  ${isEdit ? `<img src="${product.img}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:8px;margin-top:8px;" id="pImgPreview" />` : `<img id="pImgPreview" style="display:none;width:60px;height:60px;object-fit:cover;border-radius:8px;margin-top:8px;" />`}
  <div class="modal-error" id="pImgError" style="margin-top:4px;"></div>
</div>
        <div class="modal-field"><label>Price (UGX)</label><input id="pPrice" type="number" value="${isEdit ? product.price : ""}" /></div>
        <div class="modal-field"><label>Rating (1-5)</label><input id="pRating" type="number" min="1" max="5" value="${isEdit ? product.rating : 5}" /></div>
        <div class="modal-field"><label>Review Count</label><input id="pCount" type="number" value="${isEdit ? product.count : 0}" /></div>
        <div class="modal-field"><label>Badge (optional)</label><input id="pBadge" value="${isEdit ? escapeHtmlA(product.badge) : ""}" placeholder="New, Hot, Best…" /></div>
        <div class="modal-error" id="productModalError"></div>
        <div class="modal-actions">
          <button class="btn-modal-cancel" id="productModalCancel">Cancel</button>
          <button class="btn-modal-confirm" id="productModalSave">${isEdit ? "Save Changes" : "Add Product"}</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("productModalCancel").addEventListener("click", () => (root.innerHTML = ""));
  document.getElementById("productModalSave").addEventListener("click", () => saveProduct(isEdit ? product.id : null));
}

async function saveProduct(id) {
  const errorEl = document.getElementById("productModalError");
  const imgError = document.getElementById("pImgError");
  const fileInput = document.getElementById("pImgFile");
  const saveBtn = document.getElementById("productModalSave");

  let imgUrl = document.getElementById("pImg").value.trim();

  // If a new file was picked, upload it to the product-images bucket first
  if (fileInput && fileInput.files && fileInput.files[0]) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Uploading image…";
    const file = fileInput.files[0];
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("product-images")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      imgError.textContent = uploadError.message;
      saveBtn.disabled = false;
      saveBtn.textContent = id ? "Save Changes" : "Add Product";
      return;
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from("product-images")
      .getPublicUrl(path);
    imgUrl = publicUrlData.publicUrl;
    saveBtn.textContent = "Saving…";
  }

  const payload = {
    name: document.getElementById("pName").value.trim(),
    img: imgUrl,
    price: Number(document.getElementById("pPrice").value),
    rating: Number(document.getElementById("pRating").value),
    count: Number(document.getElementById("pCount").value),
    badge: document.getElementById("pBadge").value.trim(),
  };

  if (!payload.name || !payload.img || isNaN(payload.price)) {
    errorEl.textContent = "Name, image, and price are required.";
    saveBtn.disabled = false;
    saveBtn.textContent = id ? "Save Changes" : "Add Product";
    return;
  }

  let error;
  if (id) {
    ({ error } = await supabaseClient.from("products").update(payload).eq("id", id));
  } else {
    ({ error } = await supabaseClient.from("products").insert(payload));
  }

  if (error) {
    errorEl.textContent = error.message;
    saveBtn.disabled = false;
    saveBtn.textContent = id ? "Save Changes" : "Add Product";
    return;
  }

  document.getElementById("modalRoot").innerHTML = "";
  loadCatalog();
}

async function deleteProduct(id) {
  if (!confirm("Remove this product from the catalog?")) return;
  const { error } = await supabaseClient.from("products").delete().eq("id", id);
  if (error) {
    alert("Could not delete: " + error.message);
    return;
  }
  loadCatalog();
}

// ---------------------------------------------------
// ORDERS PIPELINE
// ---------------------------------------------------
async function loadOrders() {
  const orders = await fetchAllOrders();
  renderOrders(orders);
}

function renderOrders(orders) {
  const wrap = document.getElementById("ordersTable");
  const header = `
    <div class="table-row header-row" style="grid-template-columns: 1.4fr 1fr 1fr 1.4fr 0.8fr 0.8fr;">
      <span>Customer</span><span>Email</span><span>Phone</span><span>Items</span><span>Total</span><span>Status</span>
    </div>`;

  if (!orders || orders.length === 0) {
    wrap.innerHTML = header + `<p style="padding:20px;color:var(--text-mid);">No orders yet.</p>`;
    return;
  }

  wrap.innerHTML = header + orders
    .map((o) => {
      const itemsSummary = Array.isArray(o.items)
        ? o.items.map((i) => `${escapeHtmlA(i.name)} x${i.qty}`).join(", ")
        : "";
      return `
      <div class="table-row" style="grid-template-columns: 1.4fr 1fr 1fr 1.4fr 0.8fr 0.8fr;">
        <span>${escapeHtmlA(o.customer_name)}</span>
        <span>${escapeHtmlA(o.customer_email)}</span>
        <span>${escapeHtmlA(o.customer_phone)}</span>
        <span>${itemsSummary}</span>
        <span>UGX ${Number(o.total_price).toLocaleString("en-UG")}</span>
        <span class="status-pill status-${o.payment_status}">${o.payment_status}</span>
      </div>`;
    })
    .join("");
}

// ---------------------------------------------------
// INIT
/*---------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  initTabs();
  document.getElementById("authSubmit").addEventListener("click", handleAdminSignIn);
  document.getElementById("signOutBtn").addEventListener("click", handleSignOut);
  document.getElementById("addProductBtn").addEventListener("click", () => openProductModal(null));

  // If already signed in (existing session), skip the gate
  const alreadyAdmin = await checkAdminAccess();
  if (!alreadyAdmin) {
    document.getElementById("authGate").style.display = "flex";
  }
});*/

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  document.getElementById('authSubmit').addEventListener('click', handleAdminSignIn);
  document.getElementById('signOutBtn').addEventListener('click', handleSignOut);
  document.getElementById('addProductBtn').addEventListener('click', () => openProductModal(null));

  // Show spinner while checking for existing session
  const checker = document.createElement('div');
  checker.className = 'auth-checking';
  checker.innerHTML = `<div class="spin"></div><span>Checking session…</span>`;
  document.body.appendChild(checker);

  const alreadyAdmin = await checkAdminAccess();
  checker.remove();

  if (!alreadyAdmin) {
    document.getElementById('authGate').style.display = 'flex';
  }
});