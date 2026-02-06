export async function sendBetaWaitlistEmail(email: string): Promise<"ok" | "exists" | "error"> {
  try {
    const res = await fetch(
      "https://dqkygjogfxdlosktvmah.supabase.co/functions/v1/beta_waitlist",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      }
    );

    const data = await res.json();

    if (data?.ok === true && data?.registered === true) return "ok";
    if (data?.ok === true && data?.alreadyRegistered === true) return "exists";

    return "error";
  } catch {
    return "error";
  }
}
