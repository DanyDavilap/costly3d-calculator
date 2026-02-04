export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "costly3d_theme_mode";

const safeStorageGet = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
};

const safeStorageSet = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage errors to avoid blocking the UI.
  }
};

export const getStoredTheme = (): ThemeMode | null => {
  const stored = safeStorageGet(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : null;
};

export const applyTheme = (mode: ThemeMode) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.setAttribute("data-theme", mode);
};

export const initTheme = (): ThemeMode => {
  const stored = getStoredTheme();
  const resolved = stored ?? "light";
  applyTheme(resolved);
  return resolved;
};

export const isDarkModeEnabled = () => {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
};

export const toggleDarkMode = (): ThemeMode => {
  if (typeof document === "undefined") return "light";
  const next: ThemeMode = isDarkModeEnabled() ? "light" : "dark";
  applyTheme(next);
  safeStorageSet(THEME_STORAGE_KEY, next);
  return next;
};
