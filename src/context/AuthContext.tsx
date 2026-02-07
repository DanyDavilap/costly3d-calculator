import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  fetchBetaProfile,
  getSession,
  isAuthConfigured,
  markUserVerified,
  sendMagicLink,
  signOut,
  supabase,
  type BetaProfile,
  type RawFeatureFlags,
} from "../services/auth";

export type FeatureFlags = {
  branding: boolean;
  advancedMetrics: boolean;
  pdfWatermark: boolean;
  advancedExports: boolean;
  quoteExport: boolean;
};

export type AccessProfile = {
  email: string;
  plan: "beta" | "pro";
  betaExpiresAt?: string | null;
  maxQuotes: number;
  features: FeatureFlags;
};

type AuthStatus =
  | "loading"
  | "unauthenticated"
  | "authenticated"
  | "beta_expired"
  | "error"
  | "misconfigured";

type GateStatus = "none" | "beta_full";

type LoginResult =
  | { status: "link_sent" }
  | { status: "beta_full"; message?: string }
  | { status: "error"; message: string };

type AuthContextValue = {
  status: AuthStatus;
  gateStatus: GateStatus;
  profile: AccessProfile | null;
  session: Session | null;
  loginWithEmail: (email: string) => Promise<LoginResult>;
  clearGate: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Open access: simple email capture, no Supabase auth.
const OPEN_ACCESS = true;
const LOCAL_AUTH_KEY = "costly3d_local_email";

const defaultFeaturesForPlan = (plan: "beta" | "pro"): FeatureFlags => {
  if (plan === "pro") {
    return {
      branding: true,
      advancedMetrics: true,
      pdfWatermark: false,
      advancedExports: true,
      quoteExport: true,
    };
  }
  return {
    branding: false,
    advancedMetrics: true,
    pdfWatermark: true,
    advancedExports: false,
    quoteExport: true,
  };
};

const normalizeFeatures = (plan: "beta" | "pro", raw?: RawFeatureFlags | null): FeatureFlags => {
  const defaults = defaultFeaturesForPlan(plan);
  if (!raw) return defaults;
  return {
    branding: raw.branding ?? defaults.branding,
    advancedMetrics: raw.advanced_metrics ?? defaults.advancedMetrics,
    pdfWatermark: raw.pdf_watermark ?? defaults.pdfWatermark,
    advancedExports: raw.advanced_exports ?? defaults.advancedExports,
    quoteExport: raw.quote_export ?? defaults.quoteExport,
  };
};

const normalizeProfile = (profile: BetaProfile): AccessProfile => {
  const plan: "beta" | "pro" = profile.plan === "pro" ? "pro" : "beta";
  const features = normalizeFeatures(plan, profile.features);
  const maxQuotes =
    typeof profile.max_quotes === "number" && Number.isFinite(profile.max_quotes)
      ? profile.max_quotes
      : plan === "pro"
        ? 9999
        : 20;
  return {
    email: profile.email,
    plan,
    betaExpiresAt: profile.beta_expires_at ?? null,
    maxQuotes,
    features,
  };
};

const DEV_BETA_GATE = import.meta.env.VITE_DEV_BETA_GATE;
const DEV_BETA_GATE_KEY = "costly3d_dev_beta_gate";

const resolveDevBetaGate = () => {
  if (import.meta.env.DEV !== true) return null;
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(DEV_BETA_GATE_KEY);
    return stored === "full" || stored === "none" ? stored : null;
  } catch (error) {
    return null;
  }
};

const DEV_BYPASS = import.meta.env.DEV === true && (resolveDevBetaGate() ?? DEV_BETA_GATE) !== "full";

const DEV_PROFILE: AccessProfile = {
  email: "dev@costly3d.local",
  plan: "beta",
  betaExpiresAt: null,
  maxQuotes: 9999,
  features: {
    branding: true,
    advancedMetrics: true,
    pdfWatermark: false,
    advancedExports: true,
    quoteExport: true,
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [gateStatus, setGateStatus] = useState<GateStatus>("none");
  const [profile, setProfile] = useState<AccessProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const clearGate = useCallback(() => setGateStatus("none"), []);

  useEffect(() => {
    if (OPEN_ACCESS) {
      const storedEmail =
        typeof window !== "undefined" ? window.localStorage.getItem(LOCAL_AUTH_KEY) ?? "" : "";
      const validEmail =
        typeof storedEmail === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storedEmail.trim());
      if (!validEmail) {
        setStatus("unauthenticated");
        setProfile(null);
        setGateStatus("none");
        setSession(null);
        return;
      }
      const proProfile: AccessProfile = {
        email: storedEmail.trim(),
        plan: "pro",
        betaExpiresAt: null,
        maxQuotes: 9999,
        features: {
          branding: true,
          advancedMetrics: true,
          pdfWatermark: false,
          advancedExports: true,
          quoteExport: true,
        },
      };
      setProfile(proProfile);
      setStatus("authenticated");
      setGateStatus("none");
      setSession(null);
      return;
    }

    const devGate = resolveDevBetaGate() ?? DEV_BETA_GATE;
    if (import.meta.env.DEV === true && devGate === "full") {
      setStatus("unauthenticated");
      setProfile(null);
      setSession(null);
      setGateStatus("beta_full");
      return;
    }
    if (DEV_BYPASS) {
      setStatus("authenticated");
      setProfile(DEV_PROFILE);
      setSession(null);
      setGateStatus("none");
      return;
    }
    if (!isAuthConfigured) {
      setStatus("misconfigured");
      return;
    }
    getSession().then((current) => {
      setSession(current);
    });
    const subscription = supabase?.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      subscription?.data?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (OPEN_ACCESS) return;
    if (DEV_BYPASS) return;
    if (!isAuthConfigured) return;
    if (!session) {
      setProfile(null);
      setStatus("unauthenticated");
      return;
    }
    let isActive = true;
    setStatus("loading");
    if (session.user?.email_confirmed_at && !session.user?.user_metadata?.beta_verified) {
      markUserVerified().catch(() => {
        // Ignore verification errors to avoid blocking login.
      });
    }
    fetchBetaProfile().then((result) => {
      if (!isActive) return;
      if (result.status === "expired") {
        setProfile(result.profile ? normalizeProfile(result.profile) : null);
        setStatus("beta_expired");
        return;
      }
      if (result.status === "active") {
        setProfile(normalizeProfile(result.profile));
        setStatus("authenticated");
        return;
      }
      setStatus("error");
    });
    return () => {
      isActive = false;
    };
  }, [session]);

  const loginWithEmail = useCallback(async (email: string): Promise<LoginResult> => {
    if (OPEN_ACCESS) {
      const trimmed = email.trim();
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
      if (!isValid) {
        return { status: "error", message: "Ingresá un email válido" };
      }
      try {
        window.localStorage.setItem(LOCAL_AUTH_KEY, trimmed);
      } catch (error) {
        // ignore storage write errors
      }
      const proProfile: AccessProfile = {
        email: trimmed,
        plan: "pro",
        betaExpiresAt: null,
        maxQuotes: 9999,
        features: {
          branding: true,
          advancedMetrics: true,
          pdfWatermark: false,
          advancedExports: true,
          quoteExport: true,
        },
      };
      setProfile(proProfile);
      setStatus("authenticated");
      setGateStatus("none");
      return { status: "link_sent" };
    }

    if (DEV_BYPASS) {
      setStatus("authenticated");
      setProfile(DEV_PROFILE);
      return { status: "link_sent" };
    }
    const { error } = await sendMagicLink(email);
    if (error) {
      return { status: "error", message: error.message };
    }
    return { status: "link_sent" };
  }, []);

  const logout = useCallback(async () => {
    if (OPEN_ACCESS) {
      try {
        window.localStorage.removeItem(LOCAL_AUTH_KEY);
      } catch (error) {
        // ignore
      }
      setSession(null);
      setProfile(null);
      setStatus("unauthenticated");
      setGateStatus("none");
      return;
    }
    await signOut();
    setSession(null);
    setProfile(null);
    setStatus("unauthenticated");
    setGateStatus("none");
  }, []);

  const value = useMemo(
    () => ({
      status,
      gateStatus,
      profile,
      session,
      loginWithEmail,
      clearGate,
      logout,
    }),
    [status, gateStatus, profile, session, loginWithEmail, clearGate, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
