export type AppMode = "pro" | "beta";

const BETA_STARTED_AT_KEY = "costly3d_beta_started_at";
const BETA_QUOTES_COUNT_KEY = "costly3d_beta_quotes_count";
const BETA_PRODUCTIONS_COUNT_KEY = "costly3d_beta_productions_count";
const DEFAULT_BETA_QUOTE_LIMIT = 15;
const DEFAULT_BETA_PRODUCTION_LIMIT = 15;

const scopedKey = (key: string, scope?: string) => {
  const normalizedScope = scope?.trim().toLowerCase();
  return normalizedScope ? `${key}:${normalizedScope}` : key;
};

const readCount = (key: string, scope?: string) => {
  if (typeof window === "undefined") return 0;
  try {
    const parsed = Number.parseInt(window.localStorage.getItem(scopedKey(key, scope)) ?? "0", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
};

const writeCount = (key: string, value: number, scope?: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(scopedKey(key, scope), String(Math.max(0, Math.floor(value))));
  } catch {
    // Storage failures must not crash the calculator.
  }
};

const normalizeLimit = (value: number | null | undefined, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;

export const ensureBetaStartedAt = (scope?: string): Date | null => {
  if (typeof window === "undefined") return null;
  const key = scopedKey(BETA_STARTED_AT_KEY, scope);
  try {
    const stored = window.localStorage.getItem(key);
    if (stored) {
      const parsed = new Date(stored);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const startedAt = new Date();
    window.localStorage.setItem(key, startedAt.toISOString());
    return startedAt;
  } catch {
    return null;
  }
};

// The first demo pass has a usage quota but no time-based expiration.
export const isBetaExpired = (): boolean => false;

export const getBetaQuoteLimit = (configuredLimit?: number | null) =>
  normalizeLimit(configuredLimit, DEFAULT_BETA_QUOTE_LIMIT);
export const getBetaProductionLimit = (configuredLimit?: number | null) =>
  normalizeLimit(configuredLimit, DEFAULT_BETA_PRODUCTION_LIMIT);
export const getBetaQuoteCount = (scope?: string) => readCount(BETA_QUOTES_COUNT_KEY, scope);
export const getBetaProductionCount = (scope?: string) => readCount(BETA_PRODUCTIONS_COUNT_KEY, scope);

export const canConsumeQuote = (limit = DEFAULT_BETA_QUOTE_LIMIT, scope?: string) =>
  getBetaQuoteCount(scope) < limit;
export const consumeQuote = (limit = DEFAULT_BETA_QUOTE_LIMIT, scope?: string) => {
  if (!canConsumeQuote(limit, scope)) return null;
  const next = getBetaQuoteCount(scope) + 1;
  writeCount(BETA_QUOTES_COUNT_KEY, next, scope);
  return next;
};

export const canConsumeProduction = (limit = DEFAULT_BETA_PRODUCTION_LIMIT, scope?: string) =>
  getBetaProductionCount(scope) < limit;
export const consumeProduction = (limit = DEFAULT_BETA_PRODUCTION_LIMIT, scope?: string) => {
  if (!canConsumeProduction(limit, scope)) return null;
  const next = getBetaProductionCount(scope) + 1;
  writeCount(BETA_PRODUCTIONS_COUNT_KEY, next, scope);
  return next;
};

export const canAccess = (_sectionName: string) => true;

export const openBetaAccessForm = () => {
  if (typeof window === "undefined") return;
  window.open("https://dqkygjogfxdlosktvmah.supabase.co/functions/v1/beta_waitlist", "_blank");
};
