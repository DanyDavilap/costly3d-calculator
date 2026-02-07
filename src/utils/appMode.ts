export type AppMode = "pro" | "beta";

const DEV_APP_MODE_KEY = "costly3d_dev_app_mode";

const resolveDevAppMode = (): AppMode | null => {
  if (import.meta.env.DEV !== true) return null;
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(DEV_APP_MODE_KEY);
    return stored === "beta" ? "beta" : stored === "pro" ? "pro" : null;
  } catch (error) {
    return null;
  }
};

const RAW_APP_MODE = resolveDevAppMode() ?? import.meta.env.VITE_APP_MODE;
const APP_MODE: AppMode = RAW_APP_MODE === "beta" ? "beta" : "pro";

const BETA_STARTED_AT_KEY = "beta_started_at";
const BETA_QUOTES_COUNT_KEY = "beta_quotes_count";
const BETA_PRODUCTIONS_COUNT_KEY = "beta_productions_count";
const BETA_QUOTE_LIMIT = 15;
const BETA_PRODUCTION_LIMIT = 15;
const BETA_DURATION_MS = 15 * 24 * 60 * 60 * 1000;

export const BETA_ACCESS_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSckMvV_judFYw4r5OY_2Rbf8miQAUVwbKXqosMuW41G1qVzKQ/viewform";

export const getAppMode = (): AppMode => APP_MODE;
export const isBeta = (): boolean => APP_MODE === "beta";
export const isPro = (): boolean => APP_MODE === "pro";

const readNumber = (key: string, fallback = 0) => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return parsed;
  } catch (error) {
    return fallback;
  }
};

const writeNumber = (key: string, value: number) => {
  if (typeof window === "undefined") return;
  try {
    const safeValue = Math.max(0, Math.floor(value));
    window.localStorage.setItem(key, String(safeValue));
  } catch (error) {
    // Ignore storage errors to avoid blocking the app.
  }
};

export const ensureBetaStartedAt = (): Date | null => {
  if (!isBeta() || typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(BETA_STARTED_AT_KEY);
    if (stored) {
      const parsed = new Date(stored);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  } catch (error) {
    // Ignore read errors and fall through.
  }
  const now = new Date();
  try {
    window.localStorage.setItem(BETA_STARTED_AT_KEY, now.toISOString());
  } catch (error) {
    // Ignore write errors to avoid blocking the app.
  }
  return now;
};

export const isBetaExpired = (): boolean => {
  if (!isBeta()) return false;
  const startedAt = ensureBetaStartedAt();
  if (!startedAt) return false;
  return Date.now() - startedAt.getTime() > BETA_DURATION_MS;
};

export const getBetaQuoteLimit = () => BETA_QUOTE_LIMIT;
export const getBetaProductionLimit = () => BETA_PRODUCTION_LIMIT;

export const getBetaQuoteCount = () => (isBeta() ? readNumber(BETA_QUOTES_COUNT_KEY, 0) : 0);
export const getBetaProductionCount = () =>
  (isBeta() ? readNumber(BETA_PRODUCTIONS_COUNT_KEY, 0) : 0);

export const canConsumeQuote = () => {
  if (!isBeta()) return true;
  if (isBetaExpired()) return false;
  return getBetaQuoteCount() < BETA_QUOTE_LIMIT;
};

export const consumeQuote = () => {
  if (!isBeta()) return null;
  if (!canConsumeQuote()) return null;
  const next = getBetaQuoteCount() + 1;
  writeNumber(BETA_QUOTES_COUNT_KEY, next);
  return next;
};

export const canConsumeProduction = () => {
  if (!isBeta()) return true;
  if (isBetaExpired()) return false;
  return getBetaProductionCount() < BETA_PRODUCTION_LIMIT;
};

export const consumeProduction = () => {
  if (!isBeta()) return null;
  if (!canConsumeProduction()) return null;
  const next = getBetaProductionCount() + 1;
  writeNumber(BETA_PRODUCTIONS_COUNT_KEY, next);
  return next;
};

const BETA_LOCKED_SECTIONS = new Set(["profitability", "projects", "marketing", "branding"]);

export const canAccess = (sectionName: string) => {
  if (!isBeta()) return true;
  return !BETA_LOCKED_SECTIONS.has(sectionName);
};

export const openBetaAccessForm = () => {
  if (typeof window === "undefined") return;
  window.open(BETA_ACCESS_FORM_URL, "_blank", "noopener,noreferrer");
};
