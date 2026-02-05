export type BetaWaitlistResult =
  | { status: "registered" }
  | { status: "already_registered" }
  | { status: "error"; message: string };

const BETA_WAITLIST_ENDPOINT = "/functions/v1/beta_waitlistv2";

export async function sendBetaWaitlistEmail(email: string): Promise<BetaWaitlistResult> {
  try {
    const response = await fetch(BETA_WAITLIST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return { status: "error", message: "No pudimos enviar la solicitud. Intentá de nuevo." };
    }
    if (data?.registered === true) {
      return { status: "registered" };
    }
    if (data?.alreadyRegistered === true) {
      return { status: "already_registered" };
    }
    return { status: "error", message: "No pudimos enviar la solicitud. Intentá de nuevo." };
  } catch (error) {
    return { status: "error", message: "No pudimos enviar la solicitud. Intentá de nuevo." };
  }
}
