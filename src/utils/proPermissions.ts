export type UserPlan = {
  plan?: string;
} | null;

const isLocalhost = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
};

export function isDev() {
  return (
    import.meta.env.DEV === true &&
    import.meta.env.VITE_DEV_MODE === "true" &&
    isLocalhost()
  );
}

export function isProUser(user?: UserPlan) {
  if (isDev() && import.meta.env.VITE_DEV_FORCE_PRO === "true") {
    return true;
  }

  return user?.plan === "pro";
}
