import { createClient, type Session } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isAuthConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isAuthConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export type RawFeatureFlags = {
  branding?: boolean;
  advanced_metrics?: boolean;
  pdf_watermark?: boolean;
  advanced_exports?: boolean;
  quote_export?: boolean;
};

export type BetaProfile = {
  email: string;
  plan: "beta" | "pro";
  beta_expires_at?: string | null;
  max_quotes?: number | null;
  features?: RawFeatureFlags | null;
};

export type BetaAccessResult =
  | { status: "granted" | "exists"; message?: string }
  | { status: "full" | "waitlist"; message?: string }
  | { status: "error"; message: string };

export type BetaAccessIntent = "login" | "signup";

export type BetaProfileResult =
  | { status: "active"; profile: BetaProfile }
  | { status: "expired"; profile?: BetaProfile }
  | { status: "error"; message: string };

export type BetaWaitlistPayload = {
  email: string;
  source?: string;
  beta_status?: "open" | "full";
};

export type BetaWaitlistResult =
  | { status: "sent" }
  | { status: "error"; message: string };

const resolveRedirectTo = () => {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/app`;
};

export async function requestBetaAccess(
  email: string,
  intent: BetaAccessIntent = "signup",
): Promise<BetaAccessResult> {
  if (!supabase) {
    return { status: "error", message: "Configuración de autenticación incompleta." };
  }
  try {
    const { data, error } = await supabase.functions.invoke("beta-access", {
      body: { email, intent },
    });
    if (error) {
      return { status: "error", message: error.message };
    }
    const status = (data as { status?: string; message?: string } | null)?.status ?? "error";
    if (status === "full" || status === "waitlist") {
      return { status, message: (data as { message?: string })?.message };
    }
    if (status === "granted" || status === "exists") {
      return { status, message: (data as { message?: string })?.message };
    }
    return { status: "error", message: "No pudimos validar el acceso beta." };
  } catch (error) {
    return { status: "error", message: "No pudimos validar el acceso beta." };
  }
}

export async function sendMagicLink(email: string) {
  if (!supabase) {
    return { error: { message: "Configuración de autenticación incompleta." } };
  }
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: resolveRedirectTo(),
    },
  });
}

export async function fetchBetaProfile(): Promise<BetaProfileResult> {
  if (!supabase) {
    return { status: "error", message: "Configuración de autenticación incompleta." };
  }
  try {
    const { data, error } = await supabase.functions.invoke("beta-profile");
    if (error) {
      return { status: "error", message: error.message };
    }
    const payload = data as { status?: string; profile?: BetaProfile } | null;
    if (payload?.status === "expired") {
      return { status: "expired", profile: payload.profile };
    }
    if (payload?.status === "active" && payload.profile) {
      return { status: "active", profile: payload.profile };
    }
    return { status: "error", message: "No pudimos validar tu acceso." };
  } catch (error) {
    return { status: "error", message: "No pudimos validar tu acceso." };
  }
}

export async function sendBetaWaitlist(payload: BetaWaitlistPayload): Promise<BetaWaitlistResult> {
  if (!supabase) {
    return {
      status: "error",
      message: "La beta cerrada aun no esta habilitada. Intenta de nuevo mas tarde.",
    };
  }
  try {
    const { data, error } = await supabase.functions.invoke("beta-waitlist", {
      body: payload,
    });
    if (error) {
      return { status: "error", message: error.message };
    }
    const status = (data as { status?: string; message?: string } | null)?.status ?? "error";
    if (status === "sent" || status === "ok") {
      return { status: "sent" };
    }
    return {
      status: "error",
      message: (data as { message?: string } | null)?.message ?? "No pudimos enviar la solicitud.",
    };
  } catch (error) {
    return { status: "error", message: "No pudimos enviar la solicitud." };
  }
}

export async function markUserVerified() {
  if (!supabase) return;
  // Guardamos una marca simple en user_metadata para saber que el email fue confirmado.
  // Esto no requiere claves privadas y se ejecuta solo cuando el usuario ya tiene sesion valida.
  await supabase.auth.updateUser({ data: { beta_verified: true } });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}


