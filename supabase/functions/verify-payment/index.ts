import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      transaction_id,
      tx_ref,
      profile_id,
      customer_name,
      customer_email,
      customer_phone,
      items,
      expected_total,
    } = await req.json();

    if (!transaction_id || !tx_ref || !profile_id || !expected_total) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const flwSecretKey = Deno.env.get("FLW_SECRET_KEY");
    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${flwSecretKey}`,
        },
      }
    );
    const verifyData = await verifyRes.json();

    const txn = verifyData?.data;
    const isVerified =
      verifyData?.status === "success" &&
      txn?.status === "successful" &&
      txn?.tx_ref === tx_ref &&
      txn?.currency === "UGX" &&
      Number(txn?.amount) >= Number(expected_total);

    const supabaseAdmin = createClient(
      Deno.env.get("SB_URL")!,
Deno.env.get("SB_SERVICE_ROLE_KEY")!
    );

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        profile_id,
        customer_name,
        customer_email,
        customer_phone,
        items,
        total_price: expected_total,
        flutterwave_ref: tx_ref,
        payment_status: isVerified ? "Successful" : "Failed",
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ verified: isVerified, order }),
      {
        status: isVerified ? 200 : 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});