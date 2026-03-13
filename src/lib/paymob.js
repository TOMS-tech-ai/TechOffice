// paymob.js
// خدمة Paymob لدفع الاشتراكات
// ضع هذا الملف في: src/lib/paymob.js
//
// ⚠️  مهم: استدعاء Paymob API يجب أن يتم من الـ Backend (Edge Function)
//           وليس مباشرة من المتصفح — لأنه يحتاج PAYMOB_API_KEY السرية
//
// الملف هذا يحتوي:
//   1. PaymobService  — يستدعي Supabase Edge Function
//   2. usePaymob      — React hook جاهز للاستخدام
//   3. كود Edge Function (supabase/functions/paymob/index.ts)
// ─────────────────────────────────────────────────────────────

import { supabase } from "./supabaseClient";

// ─── إعدادات ──────────────────────────────────────────────────
export const PAYMOB_CONFIG = {
  iframeId:       import.meta.env.VITE_PAYMOB_IFRAME_ID,      // من لوحة Paymob
  integrationId:  import.meta.env.VITE_PAYMOB_INTEGRATION_ID, // Card integration ID
  currency:       "EGP",
  iframeBaseUrl:  "https://accept.paymob.com/api/acceptance/iframes",
};

// ─── PaymobService ─────────────────────────────────────────────
export const PaymobService = {

  // يبدأ عملية الدفع عبر Edge Function
  // يُرجع: { paymentUrl, orderId, paymentKey }
  async initiatePayment({ tenant, plan, amount }) {
    const { data, error } = await supabase.functions.invoke("paymob-initiate", {
      body: {
        tenantId:    tenant.id,
        tenantName:  tenant.name,
        tenantEmail: tenant.contact_email,
        tenantPhone: tenant.contact_phone || "01000000000",
        plan,
        amount,        // بالجنيه (يُحوَّل تلقائياً لـ قروش داخل Edge Function)
        currency:      PAYMOB_CONFIG.currency,
      },
    });
    if (error) throw new Error(error.message || "فشل في بدء الدفع");
    return data; // { orderId, paymentKey, iframeUrl }
  },

  // استعلام عن حالة المعاملة
  async checkTransactionStatus(transactionId) {
    const { data, error } = await supabase.functions.invoke("paymob-check", {
      body: { transactionId },
    });
    if (error) throw new Error(error.message);
    return data; // { success, amount_cents, created_at, ... }
  },

  // بناء رابط iframe الدفع
  buildIframeUrl(paymentKey) {
    return `${PAYMOB_CONFIG.iframeBaseUrl}/${PAYMOB_CONFIG.iframeId}?payment_token=${paymentKey}`;
  },
};

// ─── React Hook: usePaymob ─────────────────────────────────────
import { useState, useCallback } from "react";

export function usePaymob() {
  const [state, setState] = useState({
    loading:    false,
    error:      null,
    iframeUrl:  null,
    orderId:    null,
    paymentKey: null,
    status:     "idle", // idle | loading | iframe | success | failed
  });

  const startPayment = useCallback(async ({ tenant, plan, amount }) => {
    setState(s => ({ ...s, loading: true, error: null, status: "loading" }));
    try {
      const result = await PaymobService.initiatePayment({ tenant, plan, amount });
      setState(s => ({
        ...s,
        loading:    false,
        iframeUrl:  result.iframeUrl,
        orderId:    result.orderId,
        paymentKey: result.paymentKey,
        status:     "iframe",
      }));
      return result;
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err.message, status: "failed" }));
      throw err;
    }
  }, []);

  const handleSuccess = useCallback((transactionData) => {
    setState(s => ({ ...s, status: "success", loading: false }));
  }, []);

  const handleFailed = useCallback((reason) => {
    setState(s => ({ ...s, status: "failed", error: reason, loading: false }));
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, iframeUrl: null, orderId: null, paymentKey: null, status: "idle" });
  }, []);

  return { ...state, startPayment, handleSuccess, handleFailed, reset };
}


// ═══════════════════════════════════════════════════════════════
// EDGE FUNCTION — supabase/functions/paymob-initiate/index.ts
// انسخ هذا الكود في: supabase/functions/paymob-initiate/index.ts
// ثم deploy: npx supabase functions deploy paymob-initiate
// ═══════════════════════════════════════════════════════════════
/*

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYMOB_API_KEY      = Deno.env.get("PAYMOB_API_KEY")!;
const PAYMOB_INTEGRATION  = Deno.env.get("PAYMOB_INTEGRATION_ID")!;
const PAYMOB_IFRAME_ID    = Deno.env.get("PAYMOB_IFRAME_ID")!;
const PAYMOB_BASE         = "https://accept.paymob.com/api";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tenantId, tenantName, tenantEmail, tenantPhone, plan, amount } = await req.json();
    const amountCents = Math.round(amount * 100); // Paymob يستقبل القروش

    // STEP 1: Authentication Token
    const authRes = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: PAYMOB_API_KEY }),
    });
    const { token: authToken } = await authRes.json();

    // STEP 2: Order Registration
    const orderRes = await fetch(`${PAYMOB_BASE}/ecommerce/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        auth_token:     authToken,
        delivery_needed: false,
        amount_cents:   amountCents,
        currency:       "EGP",
        merchant_order_id: `${tenantId}-${Date.now()}`,
        items: [{
          name:        `اشتراك TECHOFFICE ERP — باقة ${plan}`,
          amount_cents: amountCents,
          description: `اشتراك سنوي — ${tenantName}`,
          quantity:    1,
        }],
      }),
    });
    const { id: orderId } = await orderRes.json();

    // STEP 3: Payment Key
    const pkRes = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token:     authToken,
        amount_cents:   amountCents,
        expiration:     3600, // ساعة واحدة
        order_id:       orderId,
        currency:       "EGP",
        integration_id: parseInt(PAYMOB_INTEGRATION),
        billing_data: {
          first_name:  tenantName.split(" ")[0] || "N/A",
          last_name:   tenantName.split(" ").slice(1).join(" ") || "N/A",
          email:       tenantEmail,
          phone_number: tenantPhone,
          country:     "EG",
          city:        "Cairo",
          street:      "N/A",
          building:    "N/A",
          floor:       "N/A",
          apartment:   "N/A",
        },
      }),
    });
    const { token: paymentKey } = await pkRes.json();

    // STEP 4: سجّل payment في قاعدة البيانات كـ pending
    await supabase.from("subscription_payments").insert({
      tenant_id:        tenantId,
      plan,
      amount,
      currency:         "EGP",
      gateway:          "paymob",
      gateway_order_id: String(orderId),
      status:           "pending",
    });

    return new Response(
      JSON.stringify({
        orderId,
        paymentKey,
        iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

*/


// ═══════════════════════════════════════════════════════════════
// WEBHOOK — supabase/functions/paymob-webhook/index.ts
// Paymob يرسل POST إلى هذا الرابط بعد كل معاملة
// اضبطه في: Paymob Dashboard → Settings → Webhooks
// الرابط: https://xxxx.supabase.co/functions/v1/paymob-webhook
// ═══════════════════════════════════════════════════════════════
/*

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const PAYMOB_HMAC = Deno.env.get("PAYMOB_HMAC_SECRET")!;
const supabase    = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const body = await req.json();
  const { obj: txn, type } = body;

  // التحقق من HMAC لأمان الـ Webhook
  const hmacFields = [
    txn.amount_cents, txn.created_at, txn.currency,
    txn.error_occured, txn.has_parent_transaction, txn.id,
    txn.integration_id, txn.is_3d_secure, txn.is_auth,
    txn.is_capture, txn.is_refunded, txn.is_standalone_payment,
    txn.is_voided, txn.order?.id, txn.owner,
    txn.pending, txn.source_data?.pan,
    txn.source_data?.sub_type, txn.source_data?.type,
    txn.success,
  ].join("");

  const expected = createHmac("sha512", PAYMOB_HMAC)
    .update(hmacFields).digest("hex");

  if (body.hmac !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (type === "TRANSACTION") {
    const orderId = String(txn.order?.id);
    const success = txn.success === true || txn.success === "true";

    if (success) {
      // 1. تحديث حالة الدفع
      await supabase
        .from("subscription_payments")
        .update({
          status:           "paid",
          gateway_txn_id:   String(txn.id),
          paid_at:          new Date().toISOString(),
          metadata:         txn,
          expires_at:       new Date(Date.now() + 365*24*60*60*1000)
                              .toISOString().split("T")[0], // +سنة
        })
        .eq("gateway_order_id", orderId)
        .eq("status", "pending");

      // 2. تفعيل الشركة وتجديد تاريخ الانتهاء
      const { data: payment } = await supabase
        .from("subscription_payments")
        .select("tenant_id, expires_at")
        .eq("gateway_order_id", orderId)
        .single();

      if (payment) {
        await supabase
          .from("tenants")
          .update({
            is_active:  true,
            expires_at: payment.expires_at,
          })
          .eq("id", payment.tenant_id);
      }
    } else {
      await supabase
        .from("subscription_payments")
        .update({ status: "failed", metadata: txn })
        .eq("gateway_order_id", orderId);
    }
  }

  return new Response("ok");
});

*/
