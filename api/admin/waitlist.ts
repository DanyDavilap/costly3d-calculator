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

export default async function handler(req, res) {
  if (req.method !== "GET") {
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

  const url = new URL(req.url ?? "", "http://localhost");
  const status = (url.searchParams.get("status") ?? "pending").toLowerCase();
  const search = url.searchParams.get("search") ?? "";
  const limitRaw = url.searchParams.get("limit") ?? "50";
  const limit = Math.min(Math.max(Number.parseInt(limitRaw, 10) || 50, 1), 200);

  const allowedStatuses = new Set(["pending", "approved", "rejected", "all"]);
  if (!allowedStatuses.has(status)) {
    return json(res, 400, { error: "Invalid status" });
  }

  const params = new URLSearchParams();
  params.set(
    "select",
    "id,email,status,requested_at,last_request_at,approved_at,note",
  );
  params.set("order", "requested_at.desc");
  params.set("limit", String(limit));
  if (status !== "all") {
    params.set("status", `eq.${status}`);
  }
  if (search.trim()) {
    params.set("email", `ilike.*${search.trim()}*`);
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/beta_waitlist?${params.toString()}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  const raw = await response.text();
  if (!response.ok) {
    return json(res, 500, { error: raw || "Failed to fetch waitlist" });
  }

  let data = [];
  try {
    data = raw ? JSON.parse(raw) : [];
  } catch {
    data = [];
  }

  return json(res, 200, data);
}
