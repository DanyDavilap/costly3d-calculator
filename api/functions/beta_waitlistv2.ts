import { createClient } from "@supabase/supabase-js";

type WaitlistPayload = {
  email?: string;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const parseJsonBody = (body: unknown): WaitlistPayload | null => {
  if (!body) return null;
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as WaitlistPayload;
    } catch (error) {
      return null;
    }
  }
  if (typeof body === "object") return body as WaitlistPayload;
  return null;
};

export default async function handler(req: any, res: any) {
  // Solo acepta POST con JSON. No abrir en el navegador directamente (GET responde 404).
  if (req.method !== "POST") {
    res.status(404).json({ ok: false, error: "Not found" });
    return;
  }

  const contentType = String(req.headers?.["content-type"] ?? "");
  if (!contentType.includes("application/json")) {
    res.status(400).json({ ok: false, error: "Invalid JSON body" });
    return;
  }

  const payload = parseJsonBody(req.body);
  if (!payload) {
    res.status(400).json({ ok: false, error: "Invalid JSON body" });
    return;
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  if (!email || !isValidEmail(email)) {
    res.status(400).json({ ok: false, error: "Invalid email" });
    return;
  }

  const supabaseUrl =
    process.env.SB_URL ?? process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SB_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ ok: false, error: "Missing server configuration" });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const now = new Date().toISOString();
    const { data: existing, error: selectError } = await supabaseAdmin
      .from("beta_waitlist")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (selectError) {
      res.status(500).json({ ok: false, error: "Database error" });
      return;
    }

    if (existing?.id) {
      await supabaseAdmin
        .from("beta_waitlist")
        .update({ last_request_at: now })
        .eq("id", existing.id);
      res.status(200).json({ ok: true, alreadyRegistered: true });
      return;
    }

    const { error: insertError } = await supabaseAdmin.from("beta_waitlist").insert({
      email,
      requested_at: now,
      last_request_at: now,
    });

    if (insertError) {
      res.status(500).json({ ok: false, error: "Database error" });
      return;
    }

    res.status(200).json({ ok: true, registered: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Unexpected error" });
  }
}
