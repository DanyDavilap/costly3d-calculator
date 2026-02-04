import { serve } from "https://deno.land/std@0.204.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type WaitlistPayload = {
  email?: string;
  source?: string;
  beta_status?: "open" | "full";
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

  // Parseamos el cuerpo para extraer el email y el contexto de la solicitud.
  let payload: WaitlistPayload = {};
  try {
    payload = (await req.json()) as WaitlistPayload;
  } catch (_error) {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  if (!email || !isValidEmail(email)) {
    return jsonResponse({ error: "Invalid email" }, 400);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return jsonResponse({ error: "Missing RESEND_API_KEY" }, 500);
  }

  const to = Deno.env.get("BETA_NOTIFICATION_TO") ?? "costly3d.beta@gmail.com";
  const from = Deno.env.get("BETA_NOTIFICATION_FROM") ?? "Costly3D <no-reply@costly3d.com>";
  const requestedAt = new Date().toISOString();

  const subject = "Nueva solicitud de acceso a la beta - Costly3D";
  const bodyLines = [
    `Email: ${email}`,
    `Fecha y hora de la solicitud: ${requestedAt}`,
  ];
  if (payload.source) bodyLines.push(`Origen: ${payload.source}`);
  if (payload.beta_status) bodyLines.push(`Estado beta: ${payload.beta_status}`);

  // Enviamos el email administrativo usando el proveedor configurado.
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text: bodyLines.join("\n"),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return jsonResponse({ error: "Email provider error", detail }, 502);
  }

  return jsonResponse({ status: "sent" });
});
