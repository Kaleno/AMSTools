export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertProductionJwtSecret } = await import("@/lib/production-secrets");
  assertProductionJwtSecret();
}
