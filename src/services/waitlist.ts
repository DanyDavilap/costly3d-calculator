export type BetaWaitlistResult =
  | { status: "registered" }
  | { status: "already_registered" }
  | { status: "error" };

const BETA_WAITLIST_ENDPOINT =
  "https://dqkygjogfxdlosktvmah.supabase.co/functions/v1/beta_waitlist";

export async function sendBetaWaitlistEmail(email: string): Promise<BetaWaitlistResult> {
  // Enviamos el email a la Edge Function y mapeamos la respuesta al formato esperado.
  try {
    const response = await fetch(BETA_WAITLIST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => null);
    if (data?.ok === true && data?.registered === true) {
      return { status: "registered" };
    }
    if (data?.ok === true && data?.alreadyRegistered === true) {
      return { status: "already_registered" };
    }
    return { status: "error" };
  } catch (error) {
    return { status: "error" };
  }
}
