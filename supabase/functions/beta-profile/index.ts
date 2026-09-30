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

const defaultFeaturesForPlan = (plan: "beta" | "pro") =>
  plan === "pro"
    ? {
        branding: true,
        advanced_metrics: true,
        pdf_watermark: false,
        advanced_exports: true,
        quote_export: true,
        cloud_sync: true,
      }
    : {
        branding: false,
        advanced_metrics: false,
        pdf_watermark: true,
        advanced_exports: false,
        quote_export: true,
        cloud_sync: false,
      };

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
  const userId = authData.user.id;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: profileRow, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("email, plan, beta_expires_at, max_quotes, features")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return jsonResponse({ error: "Failed to read profile" }, 500);
  }

  if (profileRow) {
    const plan = profileRow.plan === "pro" ? "pro" : "beta";
    return jsonResponse({
      status: "active",
      profile: {
        email: profileRow.email ?? email,
        plan,
        beta_expires_at: profileRow.beta_expires_at ?? null,
        max_quotes:
          typeof profileRow.max_quotes === "number" && Number.isFinite(profileRow.max_quotes)
            ? profileRow.max_quotes
            : 9999,
        features: defaultFeaturesForPlan(plan),
      },
    });
  }

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
        ...defaultFeaturesForPlan("beta"),
        advanced_metrics: true,
      },
    },
  });
});
