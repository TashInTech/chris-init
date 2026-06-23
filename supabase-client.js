/* ================================================
   CHRIS ROYAL ELECTRONIC ENTERPRISE — supabase-client.js
   Initializes Supabase + exposes auth/profile helpers.
   Include BEFORE script2.js / checkout2.js / admin.js:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="supabase-client.js"></script>
   ================================================ */

const SUPABASE_URL = "https://fxbxnuzjkvpmszhzjdhk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3CsxRqqsYHCNeamXMKlM1A_V9c2Gess";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------
// AUTH HELPERS
// ---------------------------------------------------

async function authenticateCustomer({ name, email, phone }) {
  const password = await derivePassword(email);

  // Try sign in first
  let { data: signInData } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (signInData?.user) {
    await ensureProfile(signInData.user.id, { name, email, phone });
    return signInData.user;
  }

  // Not found — sign up
  const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { name, phone } },
  });

  if (signUpError) {
    const alreadyExists = /already registered|already exists|already been registered/i.test(
      signUpError.message || ""
    );
    if (alreadyExists) {
      const { data: retrySignIn, error: retryError } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (retryError || !retrySignIn?.user) {
        throw new Error("An account with this email already exists. Please double-check the email address and try again.");
      }
      await ensureProfile(retrySignIn.user.id, { name, email, phone });
      return retrySignIn.user;
    }
    throw new Error(signUpError.message);
  }

  if (signUpData?.user) {
    await ensureProfile(signUpData.user.id, { name, email, phone });

    // Confirm we have an active session
    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (!sessionData?.session) {
      const { data: retrySignIn, error: retryError } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (retryError || !retrySignIn?.session) {
        throw new Error(
          "Account created but session not active — disable 'Confirm email' in Supabase Auth > Settings."
        );
      }
    }
    return signUpData.user;
  }

  throw new Error("Could not authenticate. Please try again.");
}

async function derivePassword(email) {
  const enc = new TextEncoder().encode(email.toLowerCase() + "_cr_salt_v1");
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function ensureProfile(userId, { name, email, phone }) {
  const { error } = await supabaseClient
    .from("profiles")
    .upsert({ id: userId, name, email, phone }, { onConflict: "id" });
  if (error) console.error("Profile upsert error:", error.message);
}

async function getCurrentProfile() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) { console.error("getCurrentProfile error:", error.message); return null; }
  return data;
}

async function isCurrentUserAdmin() {
  const profile = await getCurrentProfile();
  return !!profile?.is_admin;
}

// ---------------------------------------------------
// PRODUCT HELPERS
// ---------------------------------------------------

async function fetchProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("fetchProducts error:", error.message); return []; }
  return data;
}

function subscribeToProducts(onChange) {
  return supabaseClient
    .channel("products-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (payload) => onChange(payload))
    .subscribe();
}

// ---------------------------------------------------
// ORDER HELPERS
// ---------------------------------------------------

async function createOrder({ profileId, name, email, phone, items, total, flutterwaveRef, status }) {
  const { data, error } = await supabaseClient
    .from("orders")
    .insert({
      profile_id: profileId,
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      items: items,
      total_price: total,
      flutterwave_ref: flutterwaveRef,
      payment_status: status || "Pending",
    })
    .select()
    .single();
  if (error) { console.error("createOrder error:", error.message); throw error; }
  return data;
}

async function fetchAllOrders() {
  const { data, error } = await supabaseClient
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("fetchAllOrders error:", error.message); return []; }
  return data;
}