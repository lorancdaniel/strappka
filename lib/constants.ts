export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "twoj_tajny_klucz_jwt"
);

export const AUTH_COOKIE_NAME = "token";
export const AUTH_COOKIE_MAX_AGE = 3600; // 1 godzina
