import { serve } from "https://deno.land/std@0.204.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

type WaitlistPayload = {
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
  // Preflight CORS.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Solo acepta POST con JSON. No abrir en el navegador directamente (GET responde 404).
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Not found" }, 404);
  }

  // Parseamos el JSON y validamos el email.
  let payload: WaitlistPayload = {};
  try {
    payload = (await req.json()) as WaitlistPayload;
  } catch (_error) {
    return jsonResponse({ ok: false, error: "Invalid email" }, 400);
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  if (!email || !isValidEmail(email)) {
    return jsonResponse({ ok: false, error: "Invalid email" }, 400);
  }

  // Credenciales server-side para escribir en Supabase.
  const supabaseUrl = Deno.env.get("PROJECT_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Database error" }, 500);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Si existe, actualizamos last_request_at; si no, insertamos.
  const now = new Date().toISOString();
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("beta_waitlist")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (selectError) {
    return jsonResponse({ ok: false, error: "Database error" }, 500);
  }

  if (existing?.id) {
    const { error: updateError } = await supabaseAdmin
      .from("beta_waitlist")
      .update({ last_request_at: now })
      .eq("id", existing.id);

    if (updateError) {
      return jsonResponse({ ok: false, error: "Database error" }, 500);
    }

    return jsonResponse({ ok: true, alreadyRegistered: true }, 200);
  }

  const { error: insertError } = await supabaseAdmin.from("beta_waitlist").insert({
    email,
    requested_at: now,
    last_request_at: now,
  });

  if (insertError) {
    return jsonResponse({ ok: false, error: "Database error" }, 500);
  }

  return jsonResponse({ ok: true, registered: true }, 200);
});
