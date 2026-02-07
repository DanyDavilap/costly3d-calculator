import { serve } from "https://deno.land/std@0.204.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SB_URL");
  const anonKey = Deno.env.get("SB_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SB_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Missing Supabase credentials" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing auth header" }, 401);
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !authData?.user?.email) {
    return jsonResponse({ error: "Invalid user" }, 401);
  }

  const email = authData.user.email;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: row, error: rowError } = await supabaseAdmin
    .from("beta_waitlist")
    .select("status")
    .eq("email", email)
    .maybeSingle();

  if (rowError) {
    return jsonResponse({ error: "Failed to read beta status" }, 500);
  }

  if (!row || (row.status !== "active" && row.status !== "approved")) {
    return jsonResponse({ status: "error", message: "Access not active" }, 403);
  }

  const maxQuotes = Number.parseInt(Deno.env.get("BETA_MAX_QUOTES") ?? "20", 10);

  return jsonResponse({
    status: "active",
    profile: {
      email,
      plan: "beta",
      beta_expires_at: null,
      max_quotes: maxQuotes,
      features: {
        branding: false,
        advanced_metrics: true,
        pdf_watermark: true,
        advanced_exports: false,
        quote_export: true,
      },
    },
  });
});
