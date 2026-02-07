// All gating removed: the app is always fully open.
export type AppMode = "pro" | "beta";

export const getAppMode = (): AppMode => "pro";
export const isBeta = (): boolean => false;
export const isPro = (): boolean => true;

export const ensureBetaStartedAt = (): Date | null => null;
export const isBetaExpired = (): boolean => false;

export const getBetaQuoteLimit = () => Number.POSITIVE_INFINITY;
export const getBetaProductionLimit = () => Number.POSITIVE_INFINITY;
export const getBetaQuoteCount = () => 0;
export const getBetaProductionCount = () => 0;

export const canConsumeQuote = () => true;
export const consumeQuote = () => null;

export const canConsumeProduction = () => true;
export const consumeProduction = () => null;

export const canAccess = (_sectionName: string) => true;

export const openBetaAccessForm = () => {
  if (typeof window === "undefined") return;
  window.open("https://dqkygjogfxdlosktvmah.supabase.co/functions/v1/beta_waitlist", "_blank");
};
