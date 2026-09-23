const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const WAITLIST_ENDPOINT =
  import.meta.env.VITE_WAITLIST_ENDPOINT ??
  "https://dqkygjogfxdlosktvmah.supabase.co/functions/v1/beta_waitlist";

type WaitlistResponse = {
  ok?: boolean;
  registered?: boolean;
  alreadyRegistered?: boolean;
  error?: string;
  message?: string;
};

export type WaitlistResult =
  | { status: "registered"; message: string }
  | { status: "already_registered"; message: string }
  | { status: "error"; message: string };

export async function sendBetaWaitlistEmail(email: string): Promise<WaitlistResult> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (SUPABASE_ANON_KEY) headers.apikey = SUPABASE_ANON_KEY;
    const res = await fetch(WAITLIST_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ email }),
    });

    const raw = await res.text();
    const data = (() => {
      try {
        return raw ? (JSON.parse(raw) as WaitlistResponse) : null;
      } catch {
        return null;
      }
    })();

    const isSuccess = res.ok && data?.ok === true;
    if (isSuccess) {
      if (data?.alreadyRegistered === true) {
        return { status: "already_registered", message: "Este correo ya estaba en la lista." };
      }
      return { status: "registered", message: "Listo, quedaste en la lista." };
    }

    const serverMessage = data?.error || data?.message || raw;
    const message =
      res.status >= 500 || serverMessage === "Database error"
        ? "El servicio de registro no está disponible en este momento. Intenta nuevamente en unos minutos."
        : serverMessage || `No pudimos completar el registro (HTTP ${res.status}).`;
    return { status: "error", message };
  } catch {
    return {
      status: "error",
      message: "No pudimos conectar con el servicio de registro. Revisa tu conexión e intenta nuevamente.",
    };
  }
}
