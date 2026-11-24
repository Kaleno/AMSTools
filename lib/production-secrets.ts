/** Example values shipped in `.env.example`. Production must not keep using them. */
export const EXAMPLE_JWT_SECRET = "ganti-dengan-string-acak-minimal-32-karakter";
export const EXAMPLE_SEED_PASSWORD = "ChangeMe123!";
export const MIN_PRODUCTION_JWT_SECRET_LENGTH = 32;

function isProductionBuild(env: NodeJS.ProcessEnv) {
  return env.NEXT_PHASE === "phase-production-build";
}

/**
 * Why production must refuse this JWT secret, or null when it is acceptable.
 * Development and `next build` are left alone so local setup and the production
 * compile can run before the server process has its real secret.
 */
export function productionJwtSecretProblem(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.NODE_ENV !== "production" || isProductionBuild(env)) return null;
  const secret = env.JWT_SECRET ?? "";
  if (!secret) {
    return "JWT_SECRET belum diset. Production menolak menjalankan aplikasi tanpa secret.";
  }
  if (secret.length < MIN_PRODUCTION_JWT_SECRET_LENGTH) {
    return "JWT_SECRET terlalu pendek untuk production (minimal 32 karakter).";
  }
  if (secret === EXAMPLE_JWT_SECRET) {
    return "JWT_SECRET masih memakai nilai contoh dari .env.example. Ganti dengan string acak sebelum production.";
  }
  return null;
}

export function assertProductionJwtSecret(env: NodeJS.ProcessEnv = process.env) {
  const problem = productionJwtSecretProblem(env);
  if (problem) {
    throw new Error(problem);
  }
}

/**
 * Production seed must not store the example password.
 * Returns an error message, or null when seeding may continue.
 * In development an empty value is allowed and the seed falls back to the example.
 */
export function productionSeedPasswordProblem(
  password: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (env.NODE_ENV !== "production") return null;
  const value = (password ?? "").trim();
  if (!value || value === EXAMPLE_SEED_PASSWORD) {
    return "Production menolak seed dengan password contoh ChangeMe123!. Set SEED_ADMIN_PASSWORD ke password lain sebelum npm run db:seed (NODE_ENV=production).";
  }
  return null;
}
