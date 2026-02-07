import { serve } from "https://deno.land/std@0.204.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

type AccessPayload = {
  email?: string;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Not found" }, 404);
  }

  let payload: AccessPayload = {};
  try {
    payload = (await req.json()) as AccessPayload;
  } catch (_error) {
    return jsonResponse({ ok: false, error: "Invalid email" }, 400);
  }

  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email || !isValidEmail(email)) {
    return jsonResponse({ ok: false, error: "Invalid email" }, 400);
  }

  const supabaseUrl = Deno.env.get("PROJECT_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Database error" }, 500);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabaseAdmin
    .from("beta_waitlist")
    .select("status")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return jsonResponse({ ok: false, error: "Database error" }, 500);
  }

  if (!data) {
    return jsonResponse({ ok: true, approved: false, reason: "not_found" }, 200);
  }

  if (data.status === "approved" || data.status === "active") {
    return jsonResponse({ ok: true, approved: true }, 200);
  }

  return jsonResponse({ ok: true, approved: false, reason: "pending" }, 200);
});
