export type BetaWaitlistResult =
  | { status: "registered" }
  | { status: "already_registered" }
  | { status: "error"; message: string };

const BETA_WAITLIST_ENDPOINT = "/functions/v1/beta_waitlistv2";
const GENERIC_ERROR_MESSAGE = "Hubo un error. Intentá nuevamente.";

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
    if (!response.ok || data?.ok !== true) {
      return { status: "error", message: GENERIC_ERROR_MESSAGE };
    }
    if (data?.registered === true) {
      return { status: "registered" };
    }
    if (data?.alreadyRegistered === true) {
      return { status: "already_registered" };
    }
    return { status: "error", message: GENERIC_ERROR_MESSAGE };
  } catch (error) {
    return { status: "error", message: GENERIC_ERROR_MESSAGE };
  }
}
