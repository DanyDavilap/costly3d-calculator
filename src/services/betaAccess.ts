const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export type BetaAccessResult = {
  ok: boolean;
  approved: boolean;
  reason?: "pending" | "not_found";
  message?: string;
};

export async function checkBetaAccess(email: string): Promise<BetaAccessResult> {
  try {
    const res = await fetch(
      "https://dqkygjogfxdlosktvmah.supabase.co/functions/v1/beta_access",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email }),
      },
    );

    const raw = await res.text();
    let data: {
      ok?: boolean;
      approved?: boolean;
      reason?: "pending" | "not_found";
      error?: string;
      message?: string;
    } | null = null;

    try {
      data = raw ? (JSON.parse(raw) as typeof data) : null;
    } catch {
      data = null;
    }

    const approved = res.ok && data?.ok === true && data?.approved === true;
    const reason = data?.reason;
    const message = data?.error || data?.message || raw || `HTTP ${res.status}`;

    return {
      ok: res.ok,
      approved,
      reason,
      message,
    };
  } catch {
    return {
      ok: false,
      approved: false,
      message: "No se pudo validar el acceso.",
    };
  }
}
