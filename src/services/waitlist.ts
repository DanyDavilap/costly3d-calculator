export type BetaWaitlistResponse = {
  ok: boolean;
  registered?: boolean;
  alreadyRegistered?: boolean;
  error?: string;
};

const BETA_WAITLIST_ENDPOINT = "/functions/v1/beta_waitlist";

export async function sendBetaWaitlistEmail(email: string): Promise<BetaWaitlistResponse> {
  // Solo envía el email al Edge Function y devuelve el JSON recibido.
  try {
    const response = await fetch(BETA_WAITLIST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => null);
    return (data ?? { ok: false, error: "Hubo un error. Intentá nuevamente." }) as BetaWaitlistResponse;
  } catch (error) {
    return { ok: false, error: "Hubo un error. Intentá nuevamente." };
  }
}
