import { serve } from "https://deno.land/std@0.204.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AccessPayload = {
  email?: string;
  intent?: "login" | "signup";
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

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
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let payload: AccessPayload = {};
  try {
    payload = (await req.json()) as AccessPayload;
  } catch (_error) {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  if (!email || !isValidEmail(email)) {
    return jsonResponse({ error: "Invalid email" }, 400);
  }

  const supabaseUrl = Deno.env.get("SB_URL");
  const serviceRoleKey = Deno.env.get("SB_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing Supabase service credentials" }, 500);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const intent = payload.intent === "login" ? "login" : "signup";
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("beta_waitlist")
    .select("status, beta_status")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    return jsonResponse({ error: "Failed to read waitlist" }, 500);
  }

  if (intent === "login") {
    if (existing?.status === "active") {
      return jsonResponse({ status: "exists" });
    }
    return jsonResponse({
      status: "waitlist",
      message: "Tu acceso aun no esta activo.",
    });
  }

  const maxSlots = Number.parseInt(Deno.env.get("BETA_MAX_SLOTS") ?? "30", 10);
  const { count, error: countError } = await supabaseAdmin
    .from("beta_waitlist")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  if (countError) {
    return jsonResponse({ error: "Failed to count slots" }, 500);
  }

  const activeCount = count ?? 0;
  const hasSlot = activeCount < maxSlots;
  const betaStatus = hasSlot ? "open" : "full";

  if (existing) {
    await supabaseAdmin
      .from("beta_waitlist")
      .update({
        beta_status: betaStatus,
        last_request_at: now,
      })
      .eq("email", email);

    if (existing.status === "active") {
      return jsonResponse({ status: "exists" });
    }
    return jsonResponse({ status: hasSlot ? "granted" : "full" });
  }

  const { error: insertError } = await supabaseAdmin.from("beta_waitlist").insert({
    email,
    beta_status: betaStatus,
    status: "pending",
    request_source: "beta-access",
    requested_at: now,
    last_request_at: now,
  });

  if (insertError) {
    return jsonResponse({ error: "Failed to store waitlist" }, 500);
  }

  return jsonResponse({ status: hasSlot ? "granted" : "full" });
});
