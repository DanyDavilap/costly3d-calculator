const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const getHeader = (req, name) => {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

const readJsonBody = async (req) => {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return null;
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const passcode = getHeader(req, "x-admin-passcode");
  const expected = process.env.ADMIN_PASSCODE ?? "";
  if (!passcode || passcode !== expected) {
    return json(res, 401, { error: "Unauthorized" });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 500, { error: "Missing Supabase server credentials" });
  }

  const body = await readJsonBody(req);
  const id = body?.id;
  if (!id) {
    return json(res, 400, { error: "Missing id" });
  }

  const approvedBy = typeof body?.approvedBy === "string" ? body.approvedBy.trim() : "";
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  const payload = {
    // Usamos "active" para que beta-profile permita el acceso de inmediato.
    status: "active",
    approved_at: new Date().toISOString(),
    approved_by: approvedBy || null,
    note: note || null,
  };

  const response = await fetch(
    `${supabaseUrl}/rest/v1/beta_waitlist?id=eq.${encodeURIComponent(String(id))}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    },
  );

  const raw = await response.text();
  if (!response.ok) {
    return json(res, 500, { error: raw || "Failed to approve" });
  }

  let data = [];
  try {
    data = raw ? JSON.parse(raw) : [];
  } catch {
    data = [];
  }

  if (!Array.isArray(data) || data.length === 0) {
    return json(res, 404, { error: "Not found" });
  }

  return json(res, 200, { ok: true, data: data[0] });
}
