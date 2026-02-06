export type BetaWaitlistResponse = {
  ok: boolean;
  registered?: boolean;
  alreadyRegistered?: boolean;
  error?: string;
};

const BETA_WAITLIST_ENDPOINT =
  "https://dqkygjogfxdlosktvmah.supabase.co/functions/v1/beta_waitlist";

export async function sendBetaWaitlistEmail(email: string): Promise<BetaWaitlistResponse> {
  // Enviamos el email a la Edge Function y devolvemos el JSON sin lógica extra.
  const response = await fetch(BETA_WAITLIST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  return (await response.json()) as BetaWaitlistResponse;
}
