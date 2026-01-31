const AUTH_TOKEN_KEY = "calc3d_token";

export function isAuthenticated() {
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
}

export function login(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}
