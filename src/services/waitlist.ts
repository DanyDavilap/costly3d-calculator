const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export type WaitlistResult =
  | { status: "registered"; message: string }
  | { status: "already_registered"; message: string }
  | { status: "error"; message: string };

export async function sendBetaWaitlistEmail(email: string): Promise<WaitlistResult> {
  try {
    const res = await fetch(
      "https://dqkygjogfxdlosktvmah.supabase.co/functions/v1/beta_waitlist",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email }),
      }
    );

    const raw = await res.text();
    console.log("[beta_waitlist]", res.status, raw);
    let data: { ok?: boolean; registered?: boolean; alreadyRegistered?: boolean; error?: string; message?: string } | null =
      null;
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : null;
    } catch {
      data = null;
    }

    const isSuccess = res.ok && data?.ok === true;
    if (isSuccess) {
      if (data?.alreadyRegistered === true) {
        return { status: "already_registered", message: "Este correo ya estaba en la lista." };
      }
      return { status: "registered", message: "Listo, quedaste en la lista." };
    }

    const message = data?.error || data?.message || raw || `HTTP ${res.status}`;
    return { status: "error", message };
  } catch {
    return { status: "error", message: "Hubo un error. Intentá nuevamente." };
  }
}
