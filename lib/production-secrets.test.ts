import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  EXAMPLE_JWT_SECRET,
  EXAMPLE_SEED_PASSWORD,
  assertProductionJwtSecret,
  productionJwtSecretProblem,
  productionSeedPasswordProblem,
} from "./production-secrets";

const production = { NODE_ENV: "production" } as NodeJS.ProcessEnv;
const development = { NODE_ENV: "development" } as NodeJS.ProcessEnv;

describe("production JWT secret", () => {
  it("matches the example value published in .env.example", () => {
    const example = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
    assert.match(example, new RegExp(`JWT_SECRET="${EXAMPLE_JWT_SECRET}"`));
    assert.match(example, new RegExp(`SEED_ADMIN_PASSWORD="${EXAMPLE_SEED_PASSWORD}"`));
  });

  it("refuses a missing, short, or example secret in production", () => {
    assert.match(productionJwtSecretProblem({ ...production, JWT_SECRET: "" }) ?? "", /belum diset/);
    assert.match(
      productionJwtSecretProblem({ ...production, JWT_SECRET: "short-secret" }) ?? "",
      /terlalu pendek/,
    );
    assert.match(
      productionJwtSecretProblem({ ...production, JWT_SECRET: EXAMPLE_JWT_SECRET }) ?? "",
      /nilai contoh/,
    );
    assert.throws(() => assertProductionJwtSecret({ ...production, JWT_SECRET: EXAMPLE_JWT_SECRET }), /nilai contoh/);
  });

  it("accepts a long random secret in production", () => {
    const secret = "k7Fq2pL9mZ4vR8xN1cW6bH3yT5sD0aUe";
    assert.equal(secret.length >= 32, true);
    assert.equal(productionJwtSecretProblem({ ...production, JWT_SECRET: secret }), null);
  });

  it("does not block development or the production build", () => {
    assert.equal(productionJwtSecretProblem({ ...development, JWT_SECRET: EXAMPLE_JWT_SECRET }), null);
    assert.equal(productionJwtSecretProblem({ ...development }), null);
    assert.equal(
      productionJwtSecretProblem({
        ...production,
        NEXT_PHASE: "phase-production-build",
        JWT_SECRET: EXAMPLE_JWT_SECRET,
      }),
      null,
    );
  });
});

describe("production seed password", () => {
  it("refuses a missing or example password in production", () => {
    assert.match(productionSeedPasswordProblem(undefined, production) ?? "", /ChangeMe123!/);
    assert.match(productionSeedPasswordProblem("", production) ?? "", /ChangeMe123!/);
    assert.match(productionSeedPasswordProblem("   ", production) ?? "", /ChangeMe123!/);
    assert.match(productionSeedPasswordProblem(EXAMPLE_SEED_PASSWORD, production) ?? "", /ChangeMe123!/);
    assert.match(productionSeedPasswordProblem(`  ${EXAMPLE_SEED_PASSWORD}  `, production) ?? "", /ChangeMe123!/);
  });

  it("accepts another password in production and the example in development", () => {
    assert.equal(productionSeedPasswordProblem("AnotherPass1!", production), null);
    assert.equal(productionSeedPasswordProblem(undefined, development), null);
    assert.equal(productionSeedPasswordProblem(EXAMPLE_SEED_PASSWORD, development), null);
  });
});
