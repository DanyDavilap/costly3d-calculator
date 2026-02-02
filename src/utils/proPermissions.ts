export type UserPlan = {
  plan?: string;
} | null;

export const DEV_MODE_STORAGE_KEY = "costly3d_dev_mode";

const getStoredDevMode = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(DEV_MODE_STORAGE_KEY);
  } catch (error) {
    return null;
  }
};

export function isDev() {
  if (import.meta.env.DEV !== true) return false;
  return getStoredDevMode() === "true";
}

export function isProUser(user?: UserPlan) {
  if (isDev()) {
    return true;
  }

  return user?.plan === "pro";
}
